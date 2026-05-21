import { User } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function Avatar({ src, name, size = 32 }: AvatarProps) {
  const sizeStyle = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "User avatar"}
        className="rounded-full object-cover"
        style={sizeStyle}
        referrerPolicy="no-referrer"
      />
    );
  }

  const initials = name ? getInitials(name) : null;

  return (
    <div
      className="flex items-center justify-center rounded-full bg-muted text-muted-foreground"
      style={sizeStyle}
      aria-label={name ? `${name}'s avatar` : "User avatar"}
    >
      {initials ? (
        <span className="text-xs font-medium">{initials}</span>
      ) : (
        <User size={size * 0.6} />
      )}
    </div>
  );
}
