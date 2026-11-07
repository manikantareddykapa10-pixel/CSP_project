import React, { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import Header from './Header'
import Sidebar from './Sidebar'
import API from '../../../services/API'

const HospitalRequestNotifications = () => {
  const { user } = useSelector(state => state.auth)
  const previousStatuses = useRef(null)

  useEffect(() => {
    if (user?.role !== 'hospital') return undefined

    let active = true
    const checkRequests = async () => {
      try {
        const { data } = await API.get('/requests/mine')
        if (!active || !data?.success) return

        const requests = data.requests.filter(request => request.requestedBy === user._id)
        if (previousStatuses.current) {
          requests.forEach(request => {
            if (previousStatuses.current[request._id] === 'pending' && request.status === 'accepted') {
              toast.success(
                `🎉 Donor found for your ${request.bloodGroup} request!\nDonor: ${request.donorName} — 📞 ${request.donorPhone}`,
                { duration: 8000 }
              )
            }
            const previousResponders = previousStatuses.current[request._id + ':responders'] || []
            const newResponders = (request.responders || []).filter(
              responder => !previousResponders.includes(responder.donorId)
            )
            newResponders.forEach(responder => {
              toast.success(
                `🩸 ${responder.donorName} responded to your ${request.bloodGroup} blood request — 📞 ${responder.donorPhone}`,
                { duration: 8000 }
              )
            })
          })
        }
        previousStatuses.current = requests.reduce((statuses, request) => {
          statuses[request._id] = request.status
          statuses[request._id + ':responders'] = (request.responders || []).map(responder => responder.donorId)
          return statuses
        }, {})
      } catch (error) {
        console.error('Could not check hospital request notifications:', error)
      }
    }

    checkRequests()
    const interval = setInterval(checkRequests, 8000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [user?._id, user?.role])

  return null
}

const Layout = ({children}) => {
  return (
    <>
    <HospitalRequestNotifications />

    <div className='header'>
        <Header/>
    </div>
    <div className="row g-0">
      <div className="col-md-2">
        <Sidebar/>
      </div>
      <div className='col-md-10'>{children}</div>
    </div>

    </>
  )
}

export default Layout