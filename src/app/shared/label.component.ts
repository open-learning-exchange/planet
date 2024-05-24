import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-label',
  template: `
    <span i18n>{label, select,
      temperature {Temperature (°C)}
      pulse {Pulse (bpm)}
      bp {Blood Pressure}
      height {Height (cm)}
      weight {Weight (kg)}
      vision {Vision}
      hearing {Hearing}
      help {Help Wanted}
      offer {Offer}
      advice {Request for Advice}
      shared chat {Shared Chat}
      Cancer {Cancer}
      Cardiovascular disorders {Cardiovascular disorders}
      Cirrhosis of the liver {Cirrhosis of the liver}
      COVID-19 {COVID-19}
      Diabetes {Diabetes}
      Diarrhoea diseases {Diarrhoea diseases}
      Ebola {Ebola}
      Epilepsy {Epilepsy}
      FGM {FGM}
      Influenza {Influenza}
      Ischaemic heat disease {Ischaemic heat disease}
      Malaria {Malaria}
      Malnutrition {Malnutrition}
      Measles {Measles}
      Meningitis {Meningitis}
      Neonatal sepsis and infections {Neonatal sepsis and infections}
      HIV/AIDS {HIV/AIDS}
      Pneumonia {Pneumonia}
      Stroke {Stroke}
      Trauma {Trauma}
      Tuberculosis {Tuberculosis}
    }</span>
  `
})
export class LabelComponent {

  @Input() label: string;

}
