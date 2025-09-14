# Contributing to LT Line Monitoring System

Thank you for your interest in contributing to the LT Line Monitoring System! This project is designed to help electrical utilities monitor low-tension distribution lines in real-time.

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- MySQL 8.0+ (or SQLite for development)
- Arduino IDE (for ESP8266 development)
- Modern web browser

### Development Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/lt-line-monitoring-system.git
   cd lt-line-monitoring-system
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app_demo.py  # For quick demo with SQLite
   ```

3. **Open the frontend**
   ```bash
   # Open frontend/index.html in your browser
   ```

## 📋 How to Contribute

### Reporting Bugs
1. Check if the bug has already been reported in [Issues](https://github.com/your-username/lt-line-monitoring-system/issues)
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Python version, etc.)

### Suggesting Features
1. Check existing [Issues](https://github.com/your-username/lt-line-monitoring-system/issues) for similar suggestions
2. Create a new issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach

### Submitting Pull Requests
1. **Fork** the repository
2. **Create** a feature branch from `main`
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make** your changes
4. **Test** your changes thoroughly
5. **Commit** with descriptive messages
   ```bash
   git commit -m "Add: Real-time alert notifications via email"
   ```
6. **Push** to your fork
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Create** a Pull Request

## 🔧 Development Guidelines

### Code Style
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ES6+ features and consistent formatting
- **HTML/CSS**: Use semantic HTML and consistent CSS structure
- **Comments**: Write clear, concise comments for complex logic

### Testing
- Test all API endpoints before submitting
- Verify frontend functionality across different browsers
- Test hardware integration code if applicable
- Include test cases for new features

### Commit Message Format
Use clear, descriptive commit messages:
- `Add: New feature description`
- `Fix: Bug fix description`
- `Update: Improvement description`
- `Remove: Removed feature description`
- `Docs: Documentation changes`

## 🏗️ Project Structure

```
lt-line-monitoring-system/
├── backend/           # Flask API server
├── frontend/          # Dashboard web application
├── esp8266/          # Arduino IoT device code
├── docs/             # Documentation
└── tests/            # Test files
```

## 🎯 Areas for Contribution

### Backend Development
- API endpoint enhancements
- Database optimizations
- Authentication and security
- Performance improvements
- Error handling improvements

### Frontend Development
- UI/UX improvements
- New dashboard features
- Mobile responsiveness
- Accessibility improvements
- Browser compatibility

### IoT Development
- ESP8266 code optimizations
- Sensor integration improvements
- Communication protocol enhancements
- Hardware compatibility

### Documentation
- API documentation
- Setup guides
- Troubleshooting guides
- Code examples
- Video tutorials

### Testing
- Unit tests for backend
- Integration tests
- Frontend testing
- Hardware simulation tests

## 🔍 Code Review Process

1. All submissions require review before merging
2. Reviewers will check for:
   - Code quality and style
   - Test coverage
   - Documentation updates
   - Breaking changes
   - Security considerations

## 📚 Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [ESP8266 Arduino Core](https://github.com/esp8266/Arduino)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## 🤝 Community

- Be respectful and inclusive
- Help newcomers get started
- Share knowledge and best practices
- Provide constructive feedback

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

If you have questions about contributing, feel free to:
- Open an issue with the "question" label
- Contact the maintainers
- Check existing documentation

Thank you for helping improve the LT Line Monitoring System! 🎉
