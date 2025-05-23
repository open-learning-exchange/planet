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
      Acute Otitis Media {Acute Otitis Media}
      Acute Respiratory Infection {Acute Respiratory Infection}
      Amebiasis {Amebiasis}
      Brucellosis {Brucellosis}
      Cancer {Cancer}
      Cardiovascular disorders {Cardiovascular disorders}
      Chagas Disease {Chagas Disease}
      Chancroid {Chancroid}
      Chikungunya {Chikungunya}
      Chlamydia {Chlamydia}
      Chronic Kidney Disease {Chronic Kidney Disease}
      Cirrhosis of the liver {Cirrhosis of the liver}
      Conjunctivitis {Conjunctivitis}
      COVID-19 {COVID-19}
      Cryptosporidiosis {Cryptosporidiosis}
      Dental Caries {Dental Caries}
      Dengue {Dengue}
      Dengue Hemorrhagic Fever {Dengue Hemorrhagic Fever}
      Diabetes {Diabetes}
      Diarrhoea diseases {Diarrhoea diseases}
      Ebola {Ebola}
      Emphysema {Emphysema}
      Epilepsy {Epilepsy}
      FGM {FGM}
      Fungal Infection {Fungal Infections}
      Giardiasis {Giardiasis}
      Gonorrhea {Gonorrhea}
      Heatstroke {Heatstroke}
      Hepatitis A {Hepatitis A}
      Hepatitis B {Hepatitis B}
      Hepatitis C {Hepatitis C}
      Herpes Simplex Virus{Herpes Simplex Virus}
      HIV/AIDS {HIV/AIDS}
      Human Papillomavirus{Human Papillomavirus}
      Hypertension {Hypertension}
      Iodine Deficiency {Iodine Deficiency}
      Influenza {Influenza}
      Iron-Deficiency Anemia {Iron-Deficiency Anemia}
      Ischaemic heart disease {Ischaemic heart disease}
      Leishmaniasis {Leishmaniasis}
      Leptospirosis {Leptospirosis}
      Low Birth Weight {Low Birth Weight}
      Lymphogranuloma Venereum {Lymphogranuloma Venereum}
      Malaria {Malaria}
      Malnutrition {Malnutrition}
      Maternal Hemorrhage {Maternal Hemorrhage}
      Measles {Measles}
      Meningitis {Meningitis}
      Mycoplasma genitalium {Mycoplasma genitalium}
      Neonatal sepsis and infections {Neonatal sepsis and infections}
      Obesity {Obesity}
      Preeclampsia/Eclampsia {Preeclampsia/Eclampsia}
      Preterm Birth Complications {Preterm Birth Complications}
      Pneumonia {Pneumonia}
      Rabies {Rabies}
      Rotavirus {Rotavirus}
      Scabies {Scabies}
      Schistosomiasis {Schistosomiasis}
      Soil-Transmitted Helminths {Soil-Transmitted Helminths}
      Stroke {Stroke}
      Syphilis {Syphilis}
      Trauma {Trauma}
      Trichomoniasis {Trichomoniasis}
      Tuberculosis {Tuberculosis}
      Typhoid Fever {Typhoid Fever}
      Vitamin A Deficiency {Vitamin A Deficiency}
      Zika {Zika}
    }</span>
  `
})
export class LabelComponent {

  @Input() label: string;

}
