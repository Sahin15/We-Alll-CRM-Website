import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Container, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getVendor, updateVendor } from '../../../api/procurementApi';
import VendorForm from './VendorForm';

const EditVendor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await getVendor(id);
        const data = res.data?.vendor || res.data?.data || res.data;
        setVendor(data);
      } catch {
        setError('Failed to load vendor details.');
        toast.error('Failed to load vendor details.');
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  const handleSubmit = async (formData) => {
    await updateVendor(id, formData);
    toast.success('Vendor updated successfully!');
    navigate(`/procurement/vendors/${id}`);
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading vendor...</p>
      </Container>
    );
  }

  if (error || !vendor) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || 'Vendor not found.'}</Alert>
      </Container>
    );
  }

  // Normalise initial data to match form shape
  const initialData = {
    name: vendor.name || '',
    categories: vendor.categories || [],
    primaryContact: {
      name: vendor.primaryContact?.name || '',
      email: vendor.primaryContact?.email || '',
      phone: vendor.primaryContact?.phone || '',
    },
    additionalContacts: vendor.additionalContacts || [],
    address: {
      street: vendor.address?.street || '',
      city: vendor.address?.city || '',
      state: vendor.address?.state || '',
      pincode: vendor.address?.pincode || '',
      country: vendor.address?.country || 'India',
    },
    gstNumber: vendor.gstNumber || '',
    panNumber: vendor.panNumber || '',
    rating: vendor.rating || null,
    notes: vendor.notes || '',
    bankDetails: {
      accountNumber: vendor.bankDetails?.accountNumber || '',
      ifscCode: vendor.bankDetails?.ifscCode || '',
      bankName: vendor.bankDetails?.bankName || '',
      branchName: vendor.bankDetails?.branchName || '',
      accountHolderName: vendor.bankDetails?.accountHolderName || '',
    },
    documents: vendor.documents || [],
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Procurement', href: '/procurement' },
    { label: 'Vendors', href: '/procurement/vendors' },
    { label: vendor.name, href: `/procurement/vendors/${id}` },
    { label: 'Edit' },
  ];

  return (
    <VendorForm
      title={`Edit Vendor — ${vendor.name}`}
      submitLabel="Save Changes"
      initialData={initialData}
      breadcrumbs={breadcrumbs}
      onSubmit={handleSubmit}
    />
  );
};

export default EditVendor;
