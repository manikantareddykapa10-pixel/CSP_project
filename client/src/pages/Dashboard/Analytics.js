import React, { useEffect, useState } from "react";
import Layout from "../../components/shared/Layout/Layout";
import API from "./../../services/API";
import moment from "moment";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const Analytics = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [inventoryData,setInventoryData] = useState([]);
  const colors = ['#98D8FF','#FF8080','#F8F0E5','#F6FDC3', '#CDFAD5','#CDF0EA', '#F6C6EA', '#DFCCFB']


  const getBloodRecords= async()=>{
    try {
      const {data} = await API.get('/inventory/get-recent-inventory');
      if(data?.success){
        setInventoryData(data?.inventory);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load recent blood records.");
    }
  }

  useEffect(()=>{
    getBloodRecords();
  },[])

  const getBloodGroupData = async () => {
    try {
      const { data } = await API.get("/analytics/bloodGroups-data");
      if (data?.success) {
        setData(data?.bloodGroupData);
        console.log(data)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load blood group analytics.");
    }
  };

  useEffect(() => {
    getBloodGroupData();
  }, []);

  return (
    <Layout>
      <div className="d-flex flex-row flex-wrap align-items-center justify-content-center">
        {data.map((record,i) => (
          <div className="card m-3 p-2" key={record.bloodGroup} style={{ width: "18rem", borderRadius: '10px' ,backgroundColor:`${colors[i]}` }}>
            <div className="card-body">
              <h1 className="card-title card_title bg-light text-dark text-center mb-3">{record.bloodGroup}</h1>
              <p className="card-text">
                Total In : <b>{record.totalIn}</b> ml
              </p>
              <p className="card-text">
                Total Out : <b>{record.totalOut}</b> ml
              </p>
            </div>
            <div className="card-footer card_footer text-light bg-dark text-center">
              Total Available : <b>{record.availabeBlood}</b> ml
            </div>
          </div>
        ))}
      </div>
      <div className="container mt-3 w-75">
        <h1 className="m-3">Recent Blood Logs{user?.role === "hospital" ? " for this hospital" : ""}</h1>
      <table className="table">
              <thead>
                <tr>
                  <th scope="col">Blood Groud</th>
                  <th scope="col">InventoryType</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Donor / Hospital</th>
                  <th scope="col">Time Date</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData?.map((record)=>(
                  <tr className={(record.inventoryType.toLowerCase() === 'in') ? 'table-success' : 'table-danger'} key={record._id}>
                    <td>{record.bloodGroup}</td>
                    <td>{record.inventoryType.toUpperCase()}</td>
                    <td>{record.quantity} ml</td>
                    <td>{record.donar?.email || record.hospital?.hospitalName || record.email}</td>
                    <td>{moment(record.createdAt).format("DD/MM/YYYY hh:mm A")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
    </Layout>
  );
};

export default Analytics;
