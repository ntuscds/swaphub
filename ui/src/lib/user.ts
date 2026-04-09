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
