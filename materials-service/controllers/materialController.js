const Material = require('../models/Material');
const { cloudinary } = require('../config/cloudinary');

exports.uploadMaterial = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { originalname, mimetype, filename, path } = req.file;
    const { title, classId } = req.body;
    const uploader = req.user.id;

    const cloudinaryId = path.split('/').slice(-2).join('/'); // e.g. materials/filename

    const newMaterial = new Material({
      classId,
      uploader,
      title,
      filename: originalname,
      fileType: mimetype,
      cloudinaryId,
      uploadedAt: new Date(),
    });

    await newMaterial.save();

    res.status(201).json({
      message: 'Material uploaded successfully',
      material: newMaterial,
    });
  } catch (err) {
    console.error('UPLOAD MATERIAL ERROR:', err);
    res.status(500).json({ message: 'Material upload failed', error: err.message });
  }
};

exports.getMaterialsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const materials = await Material.find({ classId }).sort({ uploadedAt: -1 });
    res.status(200).json({ materials });
  } catch (err) {
    console.error('GET MATERIALS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch materials', error: err.message });
  }
};

exports.getSignedUrl = async (req, res) => {
  const { materialId } = req.params;
  const { action } = req.query;

  const material = await Material.findById(materialId);
  if (!material) return res.status(404).json({ message: 'Material not found' });

 const signedUrl = cloudinary.url(material.cloudinaryId, {
  resource_type: 'auto',
  type: 'private',
  sign_url: true,
  secure: true,
  expires_at: Math.floor(Date.now() / 1000) + 300,
});


  res.json({ url: signedUrl });
};



exports.deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });

    await cloudinary.uploader.destroy(material.cloudinaryId, {
      resource_type: 'auto',
    });

    await material.deleteOne();
    res.json({ message: 'Material deleted successfully' });
  } catch (err) {
    console.error('DELETE ERROR:', err);
    res.status(500).json({ message: 'Failed to delete material', error: err.message });
  }
};
