import styles from "./Avatar.module.css"

type AvatarProps = {
  name: string
}

function getInitials(name: string): string {
  const uppercase = name.match(/[A-Z]/g) ?? []
  if (uppercase.length >= 2) {
    return uppercase.slice(0, 2).join("")
  }
  return name.charAt(0).toUpperCase()
}

export default function Avatar({ name }: AvatarProps) {
  return <div className={styles.avatar}>{getInitials(name)}</div>
}
