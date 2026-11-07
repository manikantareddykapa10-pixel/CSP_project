import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Layout from '../components/shared/Layout/Layout';
import API from '../services/API';
import { updateProfilePicture } from '../redux/features/auth/authSlice';

const PROFILE_PLACEHOLDER = '/profile-placeholder.svg';

const Profile = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const fileInput = useRef(null);
  const [preview, setPreview] = useState(user?.profilePic || PROFILE_PLACEHOLDER);
  const [profilePic, setProfilePic] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImageChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile picture must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error('Could not read the selected image.');
        return;
      }
      setProfilePic(reader.result);
      setPreview(reader.result);
    };
    reader.onerror = () => toast.error('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const saveProfilePicture = async () => {
    if (!profilePic || saving) return;
    setSaving(true);
    try {
      const { data } = await API.patch('/auth/profile-picture', { profilePic });
      if (!data?.success) {
        toast.error(data?.message || 'Could not update profile picture.');
        return;
      }
      dispatch(updateProfilePicture(data.profilePic));
      setProfilePic('');
      toast.success(data.message || 'Profile picture updated.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update profile picture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <main className="container mt-4" style={{ maxWidth: 720 }}>
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h2 className="h4 mb-4">Donor Profile</h2>
            <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-4">
              <img
                src={preview}
                alt={`${user?.name || 'Donor'} profile`}
                onError={() => setPreview(PROFILE_PLACEHOLDER)}
                className="rounded-circle border"
                style={{ width: 144, height: 144, objectFit: 'cover' }}
              />
              <div className="flex-grow-1 text-center text-sm-start">
                <h3 className="h5 mb-1">{user?.name || 'Donor'}</h3>
                <p className="text-muted mb-3">{user?.email}</p>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="donorProfilePicture">
                    Profile picture
                  </label>
                  <input
                    ref={fileInput}
                    id="donorProfilePicture"
                    className="form-control"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                  />
                  <div className="form-text">JPEG, PNG, or WebP; maximum size 2 MB.</div>
                </div>
                <button
                  className="btn btn-danger"
                  type="button"
                  disabled={!profilePic || saving}
                  onClick={saveProfilePicture}
                >
                  {saving ? 'Saving...' : 'Save profile picture'}
                </button>
                {profilePic && (
                  <button
                    className="btn btn-link ms-2"
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setProfilePic('');
                      setPreview(user?.profilePic || PROFILE_PLACEHOLDER);
                      if (fileInput.current) fileInput.current.value = '';
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Profile;
