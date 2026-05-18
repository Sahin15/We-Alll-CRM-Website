import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createVendor } from '../../../api/procurementApi';
import VendorForm from './VendorForm';

const BREADCRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Procurement', href: '/procurement' },
  { label: 'Vendors', href: '/procurement/vendors' },
  { label: 'Add New Vendor' },
];

const CreateVendor = () => {
  const navigate = useNavigate();

  const handleSubmit = async (formData, isMultipart) => {
    if (isMultipart) {
      // FormData with file uploads — send as multipart
      await createVendor(formData);
    } else {
      await createVendor(formData);
    }
    toast.success('Vendor created successfully!');
    navigate('/procurement/vendors');
  };

  return (
    <VendorForm
      title="Add New Vendor"
      submitLabel="Create Vendor"
      breadcrumbs={BREADCRUMBS}
      onSubmit={handleSubmit}
    />
  );
};

export default CreateVendor;
