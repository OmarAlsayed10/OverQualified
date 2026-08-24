import type { BuilderFormData } from '../../redux/store/slices/cvBuilderSlice';

export function cvFormToPdfProps(formData: BuilderFormData) {
  const p = formData.personalInfo;
  return {
    name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
    email: p.email || '',
    phone: [p.phoneCode, p.phone].filter(Boolean).join(' '),
    town: p.town || '',
    city: p.city || '',
    country: p.country || '',
    location: [p.town, p.city, p.country].filter(Boolean).join(', '),
    professionalTitle: p.professionalTitle || '',
    linkedin: p.linkedin || '',
    github: p.github || '',
    portfolio: p.portfolio || '',
    photo: p.photo || '',
    summary: p.ProfessionalSummary || '',
    skillCategories: (formData.skills.skillCategories || [])
      .map((cat) => ({
        name: (cat.name || '').trim(),
        skills: (cat.skills || []).map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean),
      }))
      .filter((cat) => cat.skills.length > 0),
    skills: (formData.skills.skillCategories || [])
      .filter((c) => c.skills && c.skills.length > 0)
      .map((c) => (c.name ? `${c.name}: ${c.skills.join(', ')}` : c.skills.join(', ')))
      .join('\n') || (Array.isArray((formData.skills as any).skills) ? (formData.skills as any).skills.join(', ') : ''),
    languages: formData.skills.languages
      ? formData.skills.languages.split(',').map((language) => ({ name: language.trim() }))
      : [],
    certifications: formData.skills.certifications
      .filter((cert) => cert.name.trim())
      .map((cert) => ({
        name: cert.name.trim(),
        issuer: cert.issuer.trim(),
        date: cert.date.trim(),
        url: cert.url.trim(),
        description: (cert.description || '').trim(),
      })),
    experience: formData.experience.map((exp) => ({
      role: exp.jobTitle || '',
      company: exp.company || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      years: [exp.startDate, exp.endDate].filter(Boolean).join(' - '),
      location: exp.location || '',
      description: exp.description || '',
    })),
    education: formData.education.map((edu) => ({
      institution: edu.institution || '',
      degree: edu.degree || '',
      startYear: edu.startYear || '',
      endYear: edu.endYear || '',
      location: edu.location || '',
      description: edu.description || '',
    })),
    customSections: (formData.customSections || []).filter(
      (section) => section.title.trim() || section.items.some((item) => item.title.trim() || item.description.trim()),
    ),
    projects: formData.projects.map((proj) => ({
      name: proj.name || '',
      technologies: proj.technologies || '',
      demoUrl: proj.demoUrl || '',
      githubUrl: proj.githubUrl || '',
      description: proj.description || '',
    })),
  };
}
