import Person from "../models/Person.js";

export async function listPersons(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const { q, activeOnly, page = 1, limit = 50, sort = "order" } = req.query;

    const filter = {};
    if (!isAdmin || activeOnly === "true") filter.isActive = true;
    if (q && String(q).trim()) {
      const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { designation: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      Person.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Person.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

export async function getPerson(req, res, next) {
  try {
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

function validatePersonBody(body, { partial = false } = {}) {
  const errors = {};
  const required = ["name", "designation"];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || !String(body[field]).trim()) errors[field] = "Required.";
    }
  }
  if (body.links && !Array.isArray(body.links)) errors.links = "Links must be a list.";
  return errors;
}

export async function createPerson(req, res, next) {
  try {
    const body = req.body || {};
    const errors = validatePersonBody(body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }

    const count = await Person.countDocuments();
    const person = await Person.create({
      name: String(body.name).trim(),
      designation: String(body.designation).trim(),
      email: body.email || "",
      phone: body.phone || "",
      bio: body.bio || "",
      image: body.image || null,
      links: body.links || [],
      order: body.order !== undefined ? body.order : count,
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
    const errors = validatePersonBody(body, { partial: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }

    const assignable = ["name", "designation", "email", "phone", "bio", "image", "links", "order", "isActive"];
    for (const field of assignable) {
      if (body[field] !== undefined) person[field] = body[field];
    }

    await person.save();
    res.json({ success: true, data: { person } });
  } catch (err) {
    next(err);
  }
}

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

    const neighbor = await Person.findOne({ order: { [direction === "up" ? "$lt" : "$gt"]: person.order } }).sort({
      order: direction === "up" ? -1 : 1
    });
    if (!neighbor) {
      return res.json({ success: true, data: { person } });
    }

    const tmp = person.order;
    person.order = neighbor.order;
    neighbor.order = tmp;
    await Promise.all([person.save(), neighbor.save()]);

    res.json({ success: true, data: { person } });
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
