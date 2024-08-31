document.addEventListener('DOMContentLoaded', function () {
    const showcasesSection = document.getElementById('showcases');
    const postsSection = document.getElementById('posts');
    const peopleSection = document.getElementById('people');

    const showcasesLink = document.querySelector('nav ul li a[href="#showcases"]');
    const postsLink = document.querySelector('nav ul li a[href="#posts"]');
    const peopleLink = document.querySelector('nav ul li a[href="#people"]');

    showcasesLink.addEventListener('click', function () {
        showcasesSection.style.display = 'block';
        postsSection.style.display = 'none';
        peopleSection.style.display = 'none';
    });

    postsLink.addEventListener('click', function () {
        showcasesSection.style.display = 'none';
        postsSection.style.display = 'block';
        peopleSection.style.display = 'none';
    });

    peopleLink.addEventListener('click', function () {
        showcasesSection.style.display = 'none';
        postsSection.style.display = 'none';
        peopleSection.style.display = 'block';
    });

    // By default, display the showcases section
    showcasesSection.style.display = 'block';
    postsSection.style.display = 'none';
    peopleSection.style.display = 'none';
});
