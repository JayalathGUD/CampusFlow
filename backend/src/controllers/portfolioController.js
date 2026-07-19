import Portfolio from '../models/Portfolio.js';
import User from '../models/User.js';

// @desc    Get portfolio by user ID (public or personal)
// @route   GET /api/portfolios/:userId
// @access  Private (Authentication is required for query, but visible to classmates)
export const getPortfolio = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    let portfolio = await Portfolio.findOne({ user: userId }).populate(
      'user',
      'fullName email profilePicture bio university degreeProgram academicYear skills'
    );

    if (!portfolio) {
      // Proactively create an empty portfolio structure if querying own ID
      if (req.user.id === userId) {
        portfolio = await Portfolio.create({
          user: userId,
          projects: [],
          skills: [],
          certificates: [],
          achievements: []
        });
        portfolio = await Portfolio.findById(portfolio._id).populate(
          'user',
          'fullName email profilePicture bio university degreeProgram academicYear skills'
        );
      } else {
        return res.status(404).json({ message: 'Portfolio not found' });
      }
    }

    res.status(200).json({
      success: true,
      portfolio
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update portfolio details
// @route   PUT /api/portfolios
// @access  Private
export const updatePortfolio = async (req, res, next) => {
  try {
    const { projects, skills, certificates, achievements, githubLink, linkedinLink, theme } = req.body;

    let portfolio = await Portfolio.findOne({ user: req.user.id });

    if (!portfolio) {
      portfolio = await Portfolio.create({
        user: req.user.id,
        projects: projects || [],
        skills: skills || [],
        certificates: certificates || [],
        achievements: achievements || [],
        githubLink: githubLink || '',
        linkedinLink: linkedinLink || '',
        theme: theme || 'modern'
      });
    } else {
      portfolio.projects = projects !== undefined ? projects : portfolio.projects;
      portfolio.skills = skills !== undefined ? skills : portfolio.skills;
      portfolio.certificates = certificates !== undefined ? certificates : portfolio.certificates;
      portfolio.achievements = achievements !== undefined ? achievements : portfolio.achievements;
      portfolio.githubLink = githubLink !== undefined ? githubLink : portfolio.githubLink;
      portfolio.linkedinLink = linkedinLink !== undefined ? linkedinLink : portfolio.linkedinLink;
      portfolio.theme = theme !== undefined ? theme : portfolio.theme;
      
      await portfolio.save();
    }

    // Populate profile and return
    const populatedPortfolio = await Portfolio.findById(portfolio._id).populate(
      'user',
      'fullName email profilePicture bio university degreeProgram academicYear skills'
    );

    res.status(200).json({
      success: true,
      portfolio: populatedPortfolio
    });
  } catch (error) {
    next(error);
  }
};
