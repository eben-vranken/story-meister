import Link from "next/link"

const Navbar = () => {
    return (
        <nav className="h-16 w-full py-1 flex justify-between items-center top-0">
            <h1 className="font-semibold underline text-1xl">
                story-meister
            </h1>

            <section className="flex gap-x-4">
                <Link href={'/'}>Write</Link>
                <Link href={'/stories'}>Stories</Link>
            </section>
        </nav>
    )
}

export default Navbar