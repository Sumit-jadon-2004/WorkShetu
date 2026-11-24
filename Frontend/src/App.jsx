import {
    useEffect,
    useState
} from "react";

import {
    BrowserRouter,
    Route,
    Routes,
    Navigate
} from "react-router-dom";



import TractorList
    from "./Pages/Farmer/TractorList.jsx";

import MachineDetails
    from "./Pages/Farmer/MachineDetails.jsx";

import AIAssistant
    from "./Pages/Farmer/AIAssistant.jsx";

import HeroSection
    from "./Pages/Public/HeroSection.jsx";

import LabourSPage
    from "./Pages/Labour/Labours.jsx";

import LabourProfile
    from "./Pages/Labour/LabourProfile.jsx";

import LabourDashboard
    from "./Pages/Labour/LabourDashboard.jsx";

import ManageLabourListings
    from "./Pages/Labour/ManageLabourListings.jsx";

import LabourApply
    from "./Pages/Labour/LabourApply.jsx";

import RoleSelection
    from "./Pages/Labour/RoleSelection.jsx";

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

import DriverManagement
    from "./Pages/Admin/Drivers/DriverManagement.jsx";

import LabourManagement
    from "./Pages/Admin/Labour/LabourManagement.jsx";

import AdminLayout
    from "./Pages/Admin/Layout/AdminLayout.jsx";

import AdminDashboard
    from "./Pages/Admin/Dashboard/AdminDashboard.jsx";

import UsersManagement
    from "./Pages/Admin/Users/UsersManagement.jsx";

import ListingManagement
    from "./Pages/Admin/Listings/ListingManagement.jsx";

import BookingManagement
    from "./Pages/Admin/Bookings/BookingManagement.jsx";

import ReviewModeration
    from "./Pages/Admin/Reviews/ReviewModeration.jsx";

import ComplaintManagement
    from "./Pages/Admin/Complaints/ComplaintManagement.jsx";

import AdminAnalytics
    from "./Pages/Admin/Analytics/AdminAnalytics.jsx";

import AdminSettings
    from "./Pages/Admin/Settings/AdminSettings.jsx";

import OfferManagement
    from "./Pages/Admin/Offers/OfferManagement.jsx";

import AdminPlaceholder
    from "./Pages/Admin/Layout/AdminPlaceholder.jsx";

import AddListing
    from "./Pages/Owner/AddListing.jsx";

import MyBooking
    from "./Pages/Farmer/MyBooking.jsx";

import Chat
    from "./Pages/Farmer/Chat.jsx";

import OrderNotice
    from "./Pages/Common/OrderNotice.jsx";

import BottomNav
    from "./Pages/UI/BottomNav.jsx";

import Footer
    from "./Pages/Common/Footer.jsx";

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

import ProtectedRoute, {
    FarmerBookingsRoute,
    ChatRoute
} from "./components/ProtectedRoute.jsx";


function App() {




    return (

        <AuthProvider>

            <>

                


                <BrowserRouter>

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
                            path="/assistant"
                            element={<ProtectedRoute roles={["Farmer", "Driver", "Admin", "admin"]}><AIAssistant pageMode /></ProtectedRoute>}
                        />

                        <Route
                            path="/bookings"
                            element={
                                <FarmerBookingsRoute>
                                    <MyBooking />
                                </FarmerBookingsRoute>
                            }
                        />

                        <Route
                            path="/bookings/rejected"
                            element={
                                <FarmerBookingsRoute>
                                    <MyBooking />
                                </FarmerBookingsRoute>
                            }
                        />

                        <Route
                            path="/my-bookings"
                            element={
                                <FarmerBookingsRoute>
                                    <MyBooking />
                                </FarmerBookingsRoute>
                            }
                        />

                        <Route
                            path="/my-bookings/rejected"
                            element={
                                <FarmerBookingsRoute>
                                    <MyBooking />
                                </FarmerBookingsRoute>
                            }
                        />

                        <Route
                            path="/chat"
                            element={
                                <ChatRoute>
                                    <Chat />
                                </ChatRoute>
                            }
                        />

                        <Route
                            path="/machines/:id"
                            element={<MachineDetails />}
                        />

                        <Route
                            path="/machine/:id"
                            element={<MachineDetails />}
                        />

                        {/* Labour Marketplace */}
                        <Route
                            path="/Labour"
                            element={<LabourSPage />}
                        />
                        <Route
                            path="/labour/assistant"
                            element={
                                <ProtectedRoute>
                                    <AIAssistant pageMode />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/work-with-workshetu"
                            element={
                                <ProtectedRoute>
                                    <RoleSelection />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/labour"
                            element={<LabourSPage />}
                        />
                        <Route
                            path="/Labour/bookings"
                            element={<Navigate to="/bookings?type=labour" replace />}
                        />
                        <Route
                            path="/labour/bookings"
                            element={<Navigate to="/bookings?type=labour" replace />}
                        />
                        <Route
                            path="/Labour/my-bookings"
                            element={<Navigate to="/bookings?type=labour" replace />}
                        />
                        <Route
                            path="/labour/my-bookings"
                            element={<Navigate to="/bookings?type=labour" replace />}
                        />
                        <Route
                            path="/Labour/:id"
                            element={<LabourProfile />}
                        />
                        <Route
                            path="/labour/:id"
                            element={<LabourProfile />}
                        />

                        {/* Labour Provider */}
                        <Route
                            path="/labour/apply"
                            element={
                                <ProtectedRoute>
                                    <LabourApply />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/Labour/apply"
                            element={
                                <ProtectedRoute>
                                    <LabourApply />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/labour/dashboard"
                            element={
                                <ProtectedRoute roles={["Labour", "Admin"]}>
                                    <LabourDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/Labour/dashboard"
                            element={
                                <ProtectedRoute roles={["Labour", "Admin"]}>
                                    <LabourDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/labour/listings"
                            element={
                                <ProtectedRoute roles={["Labour", "Admin"]}>
                                    <ManageLabourListings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/Labour/listings"
                            element={
                                <ProtectedRoute roles={["Labour", "Admin"]}>
                                    <ManageLabourListings />
                                </ProtectedRoute>
                            }
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


                        {/* Admin Panel Layout & Nested Protected Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute roles={["Admin"]}>
                                    <AdminLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<AdminDashboard />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="users" element={<UsersManagement />} />
                            <Route path="drivers" element={<DriverManagement />} />
                            <Route path="driver-applications" element={<DriverManagement />} />
                            <Route path="labour" element={<LabourManagement />} />
                            <Route path="listings" element={<ListingManagement />} />
                            <Route path="bookings" element={<BookingManagement />} />
                            <Route path="offers" element={<OfferManagement />} />
                            <Route path="reviews" element={<ReviewModeration />} />
                            <Route path="complaints" element={<ComplaintManagement />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                            <Route path="settings" element={<AdminSettings />} />
                        </Route>


                        {/* 404 */}

                        <Route
                            path="*"
                            element={<NotFound />}
                        />

                    </Routes>

                    <OrderNotice />

                    <Footer />

                    <BottomNav />

                    <AIAssistant />

                </BrowserRouter>
            </>
        </AuthProvider>
    );
}


export default App;
