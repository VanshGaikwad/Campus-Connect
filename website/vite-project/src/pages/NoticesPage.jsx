import CrudCollectionPage from '../components/CrudCollectionPage'

const noticeFields = [
  { name: 'headline', label: 'Headline', type: 'text', required: false },
  { name: 'description', label: 'Description', type: 'textarea', required: false },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    required: false,
    options: [
      { label: 'Academic', value: 'academic' },
      { label: 'Holiday', value: 'holiday' },
      { label: 'Scholarship', value: 'scholarship' },
    ],
  },
  { name: 'date', label: 'Date', type: 'date', required: false },
  {
    name: 'noticeFile',
    label: 'Choose File (Image / PDF / DOC)',
    type: 'file',
    accept:
      'image/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    required: false,
    urlField: 'fileUrl',
    pathField: 'filePath',
    fileNameField: 'fileName',
  },
]

function NoticesPage() {
  return <CrudCollectionPage title="Notice" collectionName="notices" fields={noticeFields} />
}

export default NoticesPage
