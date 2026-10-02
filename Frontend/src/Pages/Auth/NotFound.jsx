import {
    Link
} from "react-router-dom";

import {
    Home,
    SearchX
} from "lucide-react";


export default function NotFound() {

    return (

        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">

            <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-slate-900">

                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">

                    <SearchX
                        size={38}
                        className="text-slate-500"
                    />

                </div>


                <h1 className="text-6xl font-black text-green-600">

                    404

                </h1>


                <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">

                    Page Not Found

                </h2>


                <p className="mt-2 text-slate-500 dark:text-slate-400">

                    The page you are looking for does not exist.

                </p>


                <Link
                    to="/"
                    className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                >

                    <Home size={18} />

                    Go Home

                </Link>

            </section>

        </main>
    );
}