import axios from "axios";
import { useEffect, useState } from "react";

function LabourSPage() {
  const [labourServices, setLabourServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("Labour Services Page Loaded");

    axios
      .get("/api/Labour")
      .then((res) => {
        console.log("Labour Services API response:", res.data);

        setLabourServices(res.data);
        setError("");
      })
      .catch((err) => {
        console.error("Labour Services API Error:", err);
        setError("Labour services not available.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-4 text-3xl font-bold">
        Labour Services
      </h1>

      {error && (
        <p className="mb-4 text-red-600">
          {error}
        </p>
      )}

      {labourServices.length === 0 && !error && (
        <p>Loading labour services...</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {labourServices.map((labour) => (
          <div
            key={labour._id}
            className="rounded-xl bg-white p-5 shadow"
          >
            <h2 className="text-xl font-bold">
              {labour.title}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LabourSPage;