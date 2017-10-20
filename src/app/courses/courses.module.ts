import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesaddComponent } from './add/coursesadd.component';
import { CoursesrequestComponent } from './request/coursesrequest.component';
import { CoursesRouterModule } from './courses-router.module';

import { CourseValidatorService } from '../validators/course-validator.service';
import { FormErrorMessagesComponent } from '../form-error-messages/form-error-messages.component';

@NgModule({
    imports: [CoursesRouterModule, CommonModule, FormsModule, ReactiveFormsModule],
    declarations: [
        CoursesComponent,
        CoursesaddComponent,
        CoursesrequestComponent,
        FormErrorMessagesComponent
    ],
    providers: [CourseValidatorService]
})
export class CoursesModule {}
