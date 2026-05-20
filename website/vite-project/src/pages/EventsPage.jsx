import CrudCollectionPage from '../components/CrudCollectionPage'

const eventFields = [
  {
    name: 'eventImage',
    label: 'Choose File (Image / PDF / DOC)',
    type: 'file',
    accept:
      'image/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    required: false,
    urlField: 'imageUrl',
    pathField: 'imagePath',
    fileNameField: 'imageName',
  },
  { name: 'eventName', label: 'Event Name', type: 'text', required: false },
  { name: 'description', label: 'Description', type: 'textarea', required: false },
  { name: 'venue', label: 'Venue', type: 'text', required: false },
  { name: 'date', label: 'Date', type: 'date', required: false },
  { name: 'time', label: 'Time', type: 'time', required: false },
  {
    name: 'registrationLink',
    label: 'Registration Link',
    type: 'text',
    required: false,
  },
]

function EventsPage() {
  return <CrudCollectionPage title="Event" collectionName="events" fields={eventFields} />
}

export default EventsPage
