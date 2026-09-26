import Corners from "../components/Corners";

// Thin declarative wrapper around the existing [data-magnetic] system (see
// hooks/useMagnetic.js, running document-wide from App.jsx). `corners`
// reuses the site's existing blueprint-corner button treatment (see
// Header/Hero's own CTAs) so new buttons stay visually consistent with it.
export default function MagneticButton({ as: As = "button", corners = false, className = "", children, type, ...rest }) {
  const resolvedType = As === "button" ? type || "button" : type;
  return (
    <As
      data-magnetic
      type={resolvedType}
      className={`${corners ? "blueprint " : ""}${className}`.trim()}
      {...rest}
    >
      {corners && <Corners />}
      {children}
    </As>
  );
}
