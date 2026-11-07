import base from '../../cms/product';
import { ProductFileInput } from '../components/ProductFileInput';

// The product type plus a studio-only field that links to the private file upload.
const fileField = {
  name: 'privateFile',
  title: 'Файл товара',
  type: 'string',
  readOnly: true,
  components: { input: ProductFileInput },
};

const fields = [...base.fields];
fields.splice(fields.findIndex((f) => f.name === 'image'), 0, fileField);

export default { ...base, fields };
