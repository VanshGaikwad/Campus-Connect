import CrudCollectionPage from '../components/CrudCollectionPage'

const placementFields = [
  {
    name: 'companyImage',
    label: 'Choose File (Image / PDF / DOC)',
    type: 'file',
    accept:
      'image/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    required: false,
    urlField: 'imageUrl',
    pathField: 'imagePath',
    fileNameField: 'imageName',
  },
  { name: 'company', label: 'Company', type: 'text', required: false },
  { name: 'eligibility', label: 'Eligibility', type: 'text', required: false },
  { name: 'skillsRequired', label: 'Skills Required', type: 'textarea', required: false },
  { name: 'offer', label: 'Offer', type: 'text', required: false },
  { name: 'reportingTime', label: 'Reporting Time', type: 'time', required: false },
  { name: 'venue', label: 'Venue', type: 'text', required: false },
  { name: 'date', label: 'Date', type: 'date', required: false },
  { name: 'totalHired', label: 'Total Hired', type: 'number', required: false },
]

function PlacementsPage() {
  return <CrudCollectionPage title="Placement" collectionName="placements" fields={placementFields} />
}

export default PlacementsPage
