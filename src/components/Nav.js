import Link from "next/link";

export default function Nav() {
  return (
    <nav className="flex justify-between items-center gap-5 p-5 shadow-sm">
      <h2>Logo</h2>
      <ul className="flex gap-10">
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/about">About</Link>
        </li>
        <li>
          <Link href="/users">users</Link>
        </li>
        <li>
          <Link href="/houses">Houses</Link>
        </li>
        <li>
          <Link href="/product">Products</Link>
        </li>
      </ul>
    </nav>
  );
}
