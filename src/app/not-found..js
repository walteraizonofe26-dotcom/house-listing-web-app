import Link from "next/link";
export default function ErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-6xl font-bold text-gray-800">404</h1>
            <p className="text-2xl text-gray-600 mt-4">Page Not Found</p>
            <Link href="/" className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                Go to Home
            </Link>
        </div>
    );
}
