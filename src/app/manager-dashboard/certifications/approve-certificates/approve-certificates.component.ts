import { Component, OnInit } from '@angular/core';
import { CertificationsService } from '../certifications.service';
import { AwardedCertificate } from '../../../users/users-achievements/awarded-certificate.model';
import { CouchService } from '../../../shared/couchdb.service';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { NotificationsService } from '../../../notifications/notifications.service';
import { UserService } from '../../../shared/user.service';

@Component({
  selector: 'planet-approve-certificates',
  templateUrl: './approve-certificates.component.html',
  styleUrls: ['./approve-certificates.component.scss']
})
export class ApproveCertificatesComponent implements OnInit {
  pendingCertificates: AwardedCertificate[] = [];

  constructor(
    private certificationsService: CertificationsService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private notificationsService: NotificationsService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadPendingCertificates();
  }

  loadPendingCertificates(): void {
    this.couchService.findAll('awarded_certificates').subscribe((certificates: any) => {
      this.pendingCertificates = certificates.filter(cert => cert.status === 'pending');
    });
  }

  approveCertificate(certificate: AwardedCertificate): void {
    const updatedCertificate = { ...certificate, status: 'approved', issuedAt: new Date().toISOString() };
    this.couchService.put(`awarded_certificates/${certificate._id}`, updatedCertificate).subscribe(() => {
      this.planetMessageService.showMessage('Certificate approved');
      this.loadPendingCertificates();
      this.notificationsService.sendNotificationToUser({
        user: certificate.userId,
        message: `Congratulations! You have been awarded a certificate for ${certificate.courseName}.`,
        link: '/my-achievements',
        status: 'unread',
        type: 'certificate'
      }).subscribe();
    });
  }

  denyCertificate(certificate: AwardedCertificate): void {
    const updatedCertificate = { ...certificate, status: 'denied' };
    this.couchService.put(`awarded_certificates/${certificate._id}`, updatedCertificate).subscribe(() => {
      this.planetMessageService.showMessage('Certificate denied');
      this.loadPendingCertificates();
    });
  }
}
