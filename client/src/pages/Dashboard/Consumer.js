import React, { useCallback, useEffect, useState } from "react";
import Layout from "../../components/shared/Layout/Layout";
import API from "../../services/API";
import moment from "moment";
import { useSelector } from "react-redux";
import { ProgressBar } from "react-loader-spinner";
import toast from "react-hot-toast";

const Consumer = () => {
    const { user } = useSelector((state) => state.auth);
    const [data, setData] = useState([]);
    const [temp,setTemp] =useState(false);
    //find donar records
    const getDonars = useCallback(async () => {
      try {
        const { data } = await API.post("/inventory/get-inventory-hospital", {
          filters: {
            inventoryType: "out",
            ...(user?.role === "admin" ? {} : { hospital: user?._id }),
          },
        });
        if (data?.success) {
          setData(data?.inventory);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Could not load consumer records.");
      }finally{
        setTemp(false);
      }
    }, [user?._id, user?.role]);
  
    useEffect(() => {
        setTemp(true);
      getDonars();
    }, [getDonars]);
  
    return (
      <Layout>
        {temp ? (
        <div className="d-flex justify-content-center align-items-center">
          <ProgressBar
            visible={true}
            height="200"
            width="200"
            color="#4fa94d"
            ariaLabel="progress-bar-loading"
            wrapperStyle={{}}
            wrapperClass=""
          />
        </div>
      ) : (
        <div className="container mt-4">
          <table className="table table-danger">
            <thead className="table-active">
              <tr>
                <th scope="col">Blood Group</th>
                <th scope="col">Inventory TYpe</th>
                <th scope="col">Quantity</th>
                <th scope="col">Email</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">No consumer records found.</td></tr>
              ) : data.map((record) => (
                <tr key={record._id}>
                  <td>{record.bloodGroup}</td>
                  <td>{record.inventoryType}</td>
                  <td>{record.quantity}</td>
                  <td>{record.email}</td>
                  <td>{moment(record.createdAt).format("DD/MM/YYYY hh:mm A")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </Layout>
    );
};

export default Consumer;
