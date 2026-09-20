import Person, { PERSON_TYPES, PERSON_TYPE_RANK, pinnedRank } from "../models/Person.js";
import { normalizeImage } from "../utils/normalizeImage.js";

// The public "People" section and the admin list must always agree, so both
// read through the same ordering: the pinned partners first (Jignesh Kakadiya,
// then Laljibhai Dhameliya), then main partner, co-partners and everyone else,
// each group by ascending `order` (oldest first on a tie). The team is a
// handful of people, so sorting in memory is simpler and far less fragile than
// a stored rank field that legacy records would lack.
function displayCompare(a, b) {
  const rankA = PERSON_TYPE_RANK[a.type] ?? PERSON_TYPE_RANK.other;
  const rankB = PERSON_TYPE_RANK[b.type] ?? PERSON_TYPE_RANK.other;
  return (
    pinnedRank(a.name) - pinnedRank(b.name) ||
    rankA - rankB ||
    (a.order ?? 0) - (b.order ?? 0) ||
    new Date(a.createdAt) - new Date(b.createdAt)
  );
}

// Legacy records predate the `type` field, so "other" must also match a missing one.
function typeFilter(type) {
  return type === "other" ? { $or: [{ type: "other" }, { type: { $exists: false } }] } : { type };
}

// Public visitors must never see a stale roster after an admin edit.
function noStore(res) {
  res.set("Cache-Control", "no-store");
}

export async function listPersons(req, res, next) {
  try {
    noStore(res);
    const isAdmin = Boolean(req.admin);
    const { q, activeOnly, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (!isAdmin || activeOnly === "true") filter.isActive = true;
    if (q && String(q).trim()) {
      const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { designation: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const all = (await Person.find(filter)).sort(displayCompare);
    const items = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      data: { items, total: all.length, page: pageNum, pages: Math.max(1, Math.ceil(all.length / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

export async function getPerson(req, res, next) {
  try {
    noStore(res);
    const isAdmin = Boolean(req.admin);
    const person = await Person.findById(req.params.id);
    if (!person || (!isAdmin && !person.isActive)) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }
    res.json({ success: true, data: { person } });
  } catch (err) {
    next(err);
  }
}

function validateFields(body, { partial }) {
  const errors = {};
  for (const field of ["name", "designation"]) {
    const present = body[field] !== undefined;
    if ((!partial || present) && (!body[field] || !String(body[field]).trim())) errors[field] = "Required.";
  }
  if (body.type !== undefined && !PERSON_TYPES.includes(body.type)) errors.type = "Invalid type.";
  if (body.email && !/^\S+@\S+\.\S+$/.test(String(body.email).trim())) errors.email = "Enter a valid email address.";
  if (body.links !== undefined && !Array.isArray(body.links)) errors.links = "Links must be a list.";
  if (body.order !== undefined && !Number.isFinite(Number(body.order))) errors.order = "Order must be a number.";
  return errors;
}

function fail(res, errors) {
  return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
}

export async function createPerson(req, res, next) {
  try {
    const body = req.body || {};
    const errors = validateFields(body, { partial: false });

    const normalized = await normalizeImage(body.image);
    if (normalized.error) errors.image = normalized.error;
    if (Object.keys(errors).length) return fail(res, errors);

    const type = body.type || "other";
    const sameType = await Person.find(typeFilter(type));
    const nextOrder = body.order !== undefined ? Number(body.order) : sameType.reduce((max, p) => Math.max(max, p.order ?? 0), -1) + 1;

    const person = await Person.create({
      name: String(body.name).trim(),
      designation: String(body.designation).trim(),
      type,
      email: body.email || "",
      phone: body.phone || "",
      bio: body.bio || "",
      image: normalized.image,
      links: body.links || [],
      order: nextOrder,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
    });

    res.status(201).json({ success: true, data: { person } });
  } catch (err) {
    next(err);
  }
}

export async function updatePerson(req, res, next) {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }
    const body = req.body || {};
    const errors = validateFields(body, { partial: true });

    if (body.image !== undefined) {
      const normalized = await normalizeImage(body.image);
      if (normalized.error) errors.image = normalized.error;
      else body.image = normalized.image;
    }
    if (Object.keys(errors).length) return fail(res, errors);

    const assignable = ["name", "designation", "type", "email", "phone", "bio", "image", "links", "order", "isActive"];
    for (const field of assignable) {
      if (body[field] !== undefined) person[field] = body[field];
    }

    // Legacy records may have no photo; they stay editable and can be
    // deactivated, but can't be (re)published without one.
    if (person.isActive && !person.image?.url) {
      return fail(res, { image: "Add a photo before making this person active." });
    }

    await person.save();
    res.json({ success: true, data: { person } });
  } catch (err) {
    next(err);
  }
}

// Moves a person up/down within their own type group, so the main partner can
// never be pushed below a co-partner. Orders are renumbered 0..n first so a
// swap works even when legacy records share the same `order` value.
export async function reorderPerson(req, res, next) {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }
    const { direction } = req.body || {};
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'." });
    }

    const group = (await Person.find(typeFilter(person.type || "other"))).sort(displayCompare);
    const index = group.findIndex((p) => p._id.equals(person._id));
    const target = direction === "up" ? index - 1 : index + 1;
    if (target >= 0 && target < group.length) {
      [group[index], group[target]] = [group[target], group[index]];
    }

    await Person.bulkWrite(group.map((p, i) => ({ updateOne: { filter: { _id: p._id }, update: { $set: { order: i } } } })));

    res.json({ success: true, data: { person: await Person.findById(person._id) } });
  } catch (err) {
    next(err);
  }
}

export async function deletePerson(req, res, next) {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found." });
    }
    await person.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
