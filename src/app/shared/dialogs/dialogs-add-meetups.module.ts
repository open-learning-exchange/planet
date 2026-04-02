import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetupsModule } from '../../meetups/meetups.module';
import { DialogsAddMeetupsComponent } from './dialogs-add-meetups.component';


@NgModule({
    imports: [
        CommonModule,
        MaterialModule,
        MeetupsModule,
        DialogsAddMeetupsComponent
    ],
    exports: [
        DialogsAddMeetupsComponent
    ]
})
export class DialogsAddMeetupsModule {}
