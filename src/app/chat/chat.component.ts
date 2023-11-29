import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent {
  @Input() showToolbar = true;

  dataPreload =
     `
      This is a community overview and community description, take note of it when replying to the question. You don't have to acknowledge that you have receiced the data

      Welcome to Planet Mutugi Community!

      🌍 About Us: Planet Mutugi is a vibrant online hub dedicated to knowledge sharing and community support. Whether you're a passionate learner, a small business owner, or an enthusiast in various fields, you'll find a welcoming space here.

      📚 Courses and Resources: Explore a vast array of courses and resources tailored to your interests. From chicken farming to solar panel sales, we've got you covered. Dive into our curated content and enhance your skills with the latest information and best practices.

      🤝 Teams and Enterprise Section: Connect with like-minded individuals and professionals in our Teams and Enterprise section. Collaborate on projects, share insights, and build a network that fosters growth and innovation.

      💼 Small Enterprise Assistance: For small enterprises involved in chicken farming, solar panel sales, and beyond, our community provides valuable assistance. Engage in discussions, seek advice, and access resources that can propel your business forward.

      🔧 Why Join Planet Mutugi?

      Access a wealth of courses and resources. Connect with professionals and enthusiasts. Receive support for small enterprises in specialized areas. Stay updated on industry trends and best practices. Collaborate on projects and explore new opportunities. Join us on Planet Mutugi and embark on a journey of learning, collaboration, and growth!

      Services
      Planet Mutugi offers a range of services to cater to the diverse needs of our community members. Here's a list of services provided:

      Course Sharing Platform:
      Access a diverse collection of courses spanning various topics, including chicken farming, solar panel sales, and more.

      Resource Repository:
      Explore a rich repository of resources such as articles, guides, and tools to enhance your knowledge and skills.

      Teams and Enterprise Collaboration:
      Connect with professionals and enthusiasts in dedicated Teams and Enterprise sections to collaborate on projects and share expertise.

      Small Enterprise Assistance:
      Receive targeted support and guidance for small enterprises, with a focus on sectors like chicken farming, solar panel sales, and related businesses.

      Discussion Forums:
      Engage in vibrant discussions on our forums to exchange ideas, seek advice, and stay updated on industry trends.
    `;


  constructor(private route: ActivatedRoute, private router: Router) {}

  goBack() {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }
}
