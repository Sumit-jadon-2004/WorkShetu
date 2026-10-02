import {
    useEffect,
    useState
} from "react";

import {
    BrowserRouter,
    Route,
    Routes
} from "react-router-dom";

import {
    Moon,
    Sun
} from "lucide-react";


import TractorList
    from "./Pages/Farmer/TractorList.jsx";

import MachineDetails
    from "./Pages/Farmer/MachineDetails.jsx";

import HeroSection
    from "./Pages/Public/HeroSection.jsx";

import LabourSPage
    from "./Pages/Labour/Labours.jsx";

import DriverDashboard
    from "./Pages/Driver/DriverDashboard.jsx";

import CompletedWork
    from "./Pages/Driver/CompletedWork.jsx";

import ManageListings
    from "./Pages/Driver/ManageListings.jsx";

import DriverApply
    from "./Pages/Driver/DriverApply.jsx";

import DriverApplications
    from "./Pages/Admin/DriverApplications.jsx";

import AddListing
    from "./Pages/Owner/AddListing.jsx";

import MyBooking
    from "./Pages/Farmer/MyBooking.jsx";

import Chat
    from "./Pages/Farmer/Chat.jsx";

import OrderNotice
    from "./Pages/Common/OrderNotice.jsx";

import Login
    from "./Pages/Auth/Login.jsx";

import Registration
    from "./Pages/Auth/Registration.jsx";

import Forbidden
    from "./Pages/Auth/Forbidden.jsx";

import NotFound
    from "./Pages/Auth/NotFound.jsx";

import {
    AuthProvider
} from "./context/AuthContext.jsx";

import ProtectedRoute
    from "./components/ProtectedRoute.jsx";


function App() {

    const [darkMode, setDarkMode] =
        useState(() => {

            return (
                localStorage.getItem(
                    "workshetu-theme"
                ) === "dark"
            );
        });


    useEffect(() => {

        document.body.classList.toggle(
            "dark",
            darkMode
        );

        localStorage.setItem(
            "workshetu-theme",
            darkMode
                ? "dark"
                : "light"
        );

    }, [darkMode]);


    return (

        <AuthProvider>

            <>

                {/* Theme Button */}

                <button
                    type="button"
                    onClick={() =>
                        setDarkMode(
                            previous =>
                                !previous
                        )
                    }
                    className="fixed right-5 top-5 z-50 rounded-full bg-white p-3 shadow-lg dark:bg-slate-800"
                    aria-label="Toggle theme"
                >

                    {darkMode
                        ? <Sun size={20} />
                        : <Moon size={20} />
                    }

                </button>


                <BrowserRouter>

                    <OrderNotice />

                    <Routes>

                        {/* Public */}

                        <Route
                            path="/"
                            element={<HeroSection />}
                        />

                        <Route
                            path="/machine"
                            element={<TractorList />}
                        />

                        <Route
                            path="/bookings"
                            element={

                                <ProtectedRoute>

                                    <MyBooking />

                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat"
                            element={<ProtectedRoute><Chat /></ProtectedRoute>}
                        />

                        <Route
                            path="/machines/:id"
                            element={<MachineDetails />}
                        />

                        <Route
                            path="/Labour"
                            element={<LabourSPage />}
                        />


                        {/* Auth */}

                        <Route
                            path="/login"
                            element={<Login />}
                        />

                        <Route
                            path="/register"
                            element={<Registration />}
                        />


                        {/* Driver Application */}

                        <Route
                            path="/driver/apply"
                            element={

                                <ProtectedRoute>

                                    <DriverApply />

                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/driver/application"
                            element={

                                <ProtectedRoute>

                                    <DriverApply />

                                </ProtectedRoute>
                            }
                        />


                        {/* Driver Dashboard */}

                        <Route
                            path="/Drivers"
                            element={

                                <ProtectedRoute
                                    roles={[
                                        "Driver",
                                        "Admin"
                                    ]}
                                >

                                    <DriverDashboard />

                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/driver/completed"
                            element={
                                <ProtectedRoute roles={["Driver", "Admin"]}>
                                    <CompletedWork />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/driver/listings"
                            element={
                                <ProtectedRoute roles={["Driver"]}>
                                    <ManageListings />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/driver/listings/new"
                            element={

                                <ProtectedRoute
                                    roles={["Driver"]}
                                >

                                    <AddListing />

                                </ProtectedRoute>
                            }
                        />


                        {/* Forbidden */}

                        <Route
                            path="/403"
                            element={<Forbidden />}
                        />


                        {/* Admin */}

                        <Route
                            path="/admin/dashboard"
                            element={

                                <ProtectedRoute
                                    roles={["Admin"]}
                                >

                                    <DriverApplications />

                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/admin/driver-applications"
                            element={

                                <ProtectedRoute
                                    roles={["Admin"]}
                                >

                                    <DriverApplications />

                                </ProtectedRoute>
                            }
                        />


                        {/* 404 */}

                        <Route
                            path="*"
                            element={<NotFound />}
                        />

                    </Routes>

                </BrowserRouter>

            </>

        </AuthProvider>
    );
}


export default App;
