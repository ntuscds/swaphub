export const ALLOWED_DOMAINS = ["@ntu.edu.sg", "@e.ntu.edu.sg"];

export function isAllowedUsername(_username: string) {
  const username = _username.trim();
  if (!/^[a-zA-Z0-9 ]+$/.test(username)) {
    return {
      type: "error" as const,
      message: "Username must be alphanumeric and not empty.",
    };
  }
  if (username.length === 0) {
    return {
      type: "error" as const,
      message: "Username must not be empty.",
    };
  }
  // Must be less than 24 characters.
  if (username.length > 24) {
    return {
      type: "error" as const,
      message: "Username must be <= 24 characters.",
    };
  }

  return {
    type: "success" as const,
    username,
  };
}

export function getDefaultUsername(username: string) {
  // Make sure it's alphanumeric and not empty.
  username = username.replace(/[^a-zA-Z0-9 ]/g, "");
  // Truncate to 24 characters.
  username = username.slice(0, 24);
  // Trim whitespace.
  username = username.trim();
  return username;
}

export function getProfileInitials(username: string) {
  let profileInitials = username;
  profileInitials = profileInitials?.replace(/[^a-zA-Z0-9] /g, "");
  if (profileInitials.length === 0) {
    return null;
  }
  const parts = profileInitials.split(" ");
  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getProfileImageUrl(username: string, fontSize: number = 45) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&size=128&backgroundColor=4f46e5%2C7c3aed%2C2563eb%2C0891b2%2C0d9488&backgroundType=gradientLinear&backgroundRotation=45&textColor=ffffff&fontSize=${fontSize}`;
}
