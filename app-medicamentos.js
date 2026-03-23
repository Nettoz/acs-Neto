// ACS Neto — app-medicamentos.js
// Dicionário de medicamentos e autocomplete
// Depende de: app-core.js, app-ui.js

// AUTOCOMPLETE DE MEDICAMENTOS
// ============================================

// Dicionário completo de medicamentos, CIDs e mapeamento REMUME (~22k
// ✎ Alterar apenas se atualizar a lista de medicamentos
function carregarMedicamentosCSV() {
  const csvData = `Medicamento/Insumo;Local de Acesso
Abacavir, Sulfato 300 MG;CTA/SAE
Abatacepte 125 MG/ML;CEAF
Abatacepte 250 MG/ML;CEAF
Aciclovir 200 MG;USF
Ácido Acetilsalicílico 100 MG;USF
Ácido Fólico 0,2 MG/ML;USF
Ácido Fólico 5 MG;USF
Ácido Ursodesoxicólico 300 MG;CEAF
Ácido Ursodesoxicólico 300 MG;ESAF
Ácido Valpróico 500 MG;FARMÁCIA POLO
Ácido Valpróico 50 MG/ML;FARMÁCIA POLO
Ácido Zoledrônico 5 MG/100 ML;CEAF
Acitretina 10 MG;CEAF
Acitretina 25 MG;CEAF
Adalimumabe 40 MG;CEAF
Água para Injetáveis;USF
Agulha Descartável para Aplicaçăo de Insulina;"USF; ESAF"
Albendazol 40 MG/ML;USF
Albendazol 400 MG;USF
Alendronato de Sódio 70 MG;USF
Alemtuzumabe 10 MG/ML;CEAF
Alfadornase 2,5 MG;CEAF
Alfaelosulfase 1 MG/ML;CEAF
Alfaepoetina 1.000 UI;CEAF
Alfaepoetina 2.000 UI;CEAF
Alfaepoetina 3.000 UI;CEAF
Alfaepoetina 4.000 UI;CEAF
Alfaepoetina 10.000 UI;CEAF
Alfagalsidase 1 MG/ML;CEAF
Alfainterferona 2B 3.000.000 UI;CEAF
Alfainterferona 2B 5.000.000 UI;CEAF
Alfainterferona 2B 10.000.000 UI;CEAF
Alfataliglicerase 200 UI;CEAF
Alogliptina, Benzoato 25 MG;ESAF
Alprazolam 0,5 MG;FARMÁCIA POLO
Alprazolam 2 MG;FARMÁCIA POLO
Amantadina, Cloridrato 100 MG;CEAF
Ambrisentana 5 MG;CEAF
Ambrisentana 10 MG;CEAF
Aminofilina 24 MG/ML;USF
Amitriptilina 25 MG;FARMÁCIA POLO
Amoxicilina 50 MG/ML;USF
Amoxicilina 500 MG;USF
Amoxicilina + Clavulanato de Potássio 500 MG + 125 MG;USF
Amoxicilina + Clavulanato de Potássio 50 MG + 12,5 MG/ML;USF
Anlodipino, Besilato 5 MG;USF
Atazanavir, Sulfato 300 MG;CTA/SAE
Atenolol 50 MG;USF
Atorvastatina, Cálcica 10 MG;CEAF
Atorvastatina, Cálcica 20 MG;CEAF
Atorvastatina, Cálcica 40 MG;CEAF
Atropina, Sulfato 0,25 MG/ML;USF
Azatioprina 50 MG;CEAF
Azitromicina 40 MG/ML;USF
Azitromicina 500 MG;USF
Baclofeno 10 MG;ESAF
Baricitinibe 2 MG;CEAF
Baricitinibe 4 MG;CEAF
Beclometasona, Dipropionato 200 MCG/DOSE;USF
Beclometasona, Dipropionato 50 MCG/DOSE;USF
Benzilpenicilina Benzatina 1.200.000 UI;USF
Betainterferona 1A 6.000.000 UI (22 MCG);CEAF
Betainterferona 1A 6.000.000 UI (30 MCG);CEAF
Betainterferona 1A 12.000.000 UI (44 MCG);CEAF
Betainterferona 1B 9.600.000 UI (300 MCG);CEAF
Bimatoprosta 0,3 MG/ML;CEAF
Biotina 2,5 MG;CEAF
Biperideno 2 MG;FARMÁCIA POLO
Bosentana 62,5 MG;CEAF
Bosentana 125 MG;CEAF
Brinzolamida 10 MG/ML;CEAF
Brometo de Tiotrópio Monoidratado + Cloridrato de Olodaterol 2,5 MCG + 2,5 MCG;CEAF
Brometo de Umeclidínio + Trifenatato de Vilanterol 62,5 MCG + 25 MCG;CEAF
Bromoprida 5 MG/ML;USF
Budesonida 50 MCG;CEAF
Budesonida 200 MCG;ESAF
Bupropiona, Cloridrato 150 MG;USF
Burosumabe 10 MG/ML;CEAF
Burosumabe 20 MG/ML;CEAF
Burosumabe 30 MG/ML;CEAF
Cabergolina 0,5 MG;CEAF
Calcipotriol 50 MCG/G;CEAF
Calcitonina 200 UI/DOSE;CEAF
Calcitriol 0,25 MCG;CEAF
Captopril 25 MG;USF
Carbamazepina 20 MG/ML;FARMÁCIA POLO
Carbamazepina 200 MG;FARMÁCIA POLO
Carbonato de Cálcio 1250 MG + Colecalciferol 400 UI;USF
Carbonato de Lítio 300 MG;FARMÁCIA POLO
Carvedilol 25 MG;CAF
Carvedilol 6,25 MG;CAF
Cefalexina 50 MG/ML;USF
Cefalexina 500 MG;USF
Certolizumabe Pegol 200 MG/ML;CEAF
Cetoprofeno 50 MG/ML;USF
Ciclofosfamida 50 MG;CEAF
Ciclosporina 100 MG;CEAF
Ciclosporina 100 MG/ML;CEAF
Ciclosporina 25 MG;CEAF
Ciclosporina 50 MG;CEAF
Cilostazol 100 MG;USF
Cimetidina 150 MG/ML;USF
Cinacalcete, Cloridrato 30 MG;CEAF
Cinacalcete, Cloridrato 60 MG;CEAF
Ciprofibrato 100 MG;ESAF
Ciprofloxacino, Cloridrato 500 MG;USF
Ciproterona, Acetato 50 MG;CEAF
Citalopram 20 MG;FARMÁCIA POLO
Claritromicina 500 MG;USF
Clobazam 10 MG;CEAF
Clobazam 20 MG;CEAF
Clobetasol, Propionato 0,5 MG/G;CEAF
Clofazimina 100 MG;USF
Clofazimina 50 MG;USF
Clomipramina 25 MG;FARMÁCIA POLO
Clonazepam 0,5 MG;FARMÁCIA POLO
Clonazepam 2,5 MG/ML;FARMÁCIA POLO
Clonazepam 2 MG;FARMÁCIA POLO
Clopidogrel 75 MG;ESAF
Cloreto de Sódio 9 MG/ML;USF
Cloroquina, Difosfato 150 MG;CEAF
Clorpromazina 100 MG;FARMÁCIA POLO
Clorpromazina 25 MG;FARMÁCIA POLO
Clorpromazina 40 MG/ML;FARMÁCIA POLO
Clorpromazina, Cloridrato 5 MG/ML;FARMÁCIA POLO
Clozapina 25 MG;CEAF
Clozapina 100 MG;CEAF
Codeína, Fosfato 30 MG;CEAF
Codeína, Fosfato 60 MG;CEAF
Dapagliflozina 10 MG;CEAF
Dapsona 100 MG;USF
Dapsona 50 MG;USF
Darunavir 600 MG;CTA/SAE
Darunavir 800 MG;CTA/SAE
Deferasirox 125 MG;CEAF
Deferasirox 250 MG;CEAF
Deferasirox 500 MG;CEAF
Deferiprona 500 MG;CEAF
Desferroxamina, Mesilato 500 MG;CEAF
Desmopressina, Acetato 0,1 MG;CEAF
Desmopressina, Acetato 0,1 MG/ML;CEAF
Desmopressina, Acetato 0,2 MG;CEAF
Derivado Proteico Purificado (Tuberculina) 50 UT/ML;CTA/SAE
Dexametasona 1 MG/G;USF
Diazepam 10 MG;FARMÁCIA POLO
Diazepam 5 MG/ML;FARMÁCIA POLO
Dipirona Sódica 500 MG;USF
Dipirona Sódica 500 MG/ML;USF
Dolutegravir + Lamivudina 50 MG + 300 MG;CTA/SAE
Dolutegravir Sódico 50 MG;CTA/SAE
Domperidona 1 MG/ML;ESAF
Domperidona 10 MG;ESAF
Donepezila, Cloridrato 5 MG;CEAF
Donepezila, Cloridrato 10 MG;CEAF
Dorzolamida, Cloridrato 20 MG/ML;CAF
Doxazosina, Mesilato 2 MG;USF
Eculizumabe 10 MG/ML;CEAF
Efavirenz 600 MG;CTA/SAE
Eltrombopague Olamina 25 MG;CEAF
Eltrombopague Olamina 50 MG;CEAF
Enalapril, Maleato 20 MG;USF
Enoxaparina Sódica 40 MG/0,4 ML;ESAF
Enoxaparina Sódica 40 MG/0,4 ML;CEAF
Enoxaparina Sódica 60 MG/0,6 ML;CEAF
Entacapona 200 MG;CEAF
Epinefrina 1 MG/ML;USF
Escopolamina, Butilbrometo + Dipirona Sódica 4 + 500 MG/ML;USF
Escopolamina, Butilbrometo 20 MG/ML;USF
Espiramicina 1.500.000 UI;CESAF
Espironolactona 25 MG;USF
Estreptomicina, Sulfato 1 G;USF
Etambutol, Cloridrato 400 MG;USF
Etanercepte 25 MG;CEAF
Etanercepte 50 MG;CEAF
Etossuximida 50 MG/ML;CEAF
Etravirina 200 MG;CESAF
Everolimo 0,5 MG;CEAF
Everolimo 0,75 MG;CEAF
Everolimo 1 MG;CEAF
Fenitoína 100 MG;FARMÁCIA POLO
Fenobarbital 100 MG;FARMÁCIA POLO
Fenobarbital 40 MG/ML;FARMÁCIA POLO
Filgrastim 300 MCG;CEAF
Finasterida 5 MG;USF
Fingolimode, Cloridrato 0,5 MG;CEAF
Fitomenadiona 10 MG/ML;USF
Fluconazol 150 MG;USF
Fludrocortisona, Acetato 0,1 MG;CEAF
Fluoxetina 20 MG;FARMÁCIA POLO
Formoterol, Fumarato + Budesonida 6 MCG + 200 MCG;CEAF
Formoterol, Fumarato + Budesonida 12 MCG + 400 MCG;CEAF
Formoterol, Fumarato 12 MCG;CEAF
Fumarato de Dimetila 120 MG;CEAF
Fumarato de Dimetila 240 MG;CEAF
Furosemida 10 MG/ML;USF
Furosemida 40 MG;USF
Gabapentina 300 MG;FARMÁCIA POLO
Gabapentina 400 MG;CEAF
Galantamina, Bromidrato 8 MG;CEAF
Galantamina, Bromidrato 16 MG;CEAF
Galantamina, Bromidrato 24 MG;CEAF
Galsulfase 1 MG/ML;CEAF
Gel Lubrificante;CTA/SAE
Glatirâmer, Acetato 40 MG;CEAF
Glibenclamida 5 MG;USF
Gliclazida 30 MG;USF
Gliclazida 60 MG;USF
Glicosamina + Condroitina, Sulfato 1,5 + 1,2 G;ESAF
Glicose 50 MG/ML;USF
Glicose 500 MG/ML;USF
Golimumabe 50 MG;CEAF
Gosserrelina, Acetato 10,8 MG;CEAF
Gosserrelina, Acetato 3,60 MG;CEAF
Haloperidol 1 MG;FARMÁCIA POLO
Haloperidol 2 MG/ML;FARMÁCIA POLO
Haloperidol 5 MG;FARMÁCIA POLO
Haloperidol 5 MG/ML;FARMÁCIA POLO
Haloperidol, Decanoato 50 MG/ML;FARMÁCIA POLO
Hidroclorotiazida 25 MG;USF
Hidrocortisona, Succinato Sódico 100 MG;USF
Hidrocortisona, Succinato Sódico 500 MG;USF
Hidroxicloroquina, Sulfato 400 MG;CEAF
Hidroxiureia 500 MG;CEAF
Hipoclorito de Sódio 2,5%;USF
Ibuprofeno 50 MG/ML;USF
Ibuprofeno 600 MG;USF
Idursulfase Alfa 2 MG/ML;CEAF
Iloprosta 10 MCG/ML;CEAF
Imiglucerase 400 UI;CEAF
Imiquimode 50 MG/G;ESAF
Imunoglobulina Humana 5 G;CEAF
Infliximabe 10 MG/ML;CEAF
Insulina Análoga de Açăo Prolongada 100 UI/ML;CEAF
Insulina Análoga de Açăo Rápida 100 UI/ML;CEAF
Insulina Análoga Ultra-Rápida 100 UI/ML;ESAF
Insulina Degludeca 100 UI/ML;ESAF
Insulina Glargina 100 UI/ML;ESAF
Insulina Humana NPH 100 UI/ML;USF
Insulina Humana Regular 100 UI/ML;USF
Ipratrópio, Brometo 0,25 MG/ML;USF
Isoniazida 100 MG;USF
Isoniazida 300 MG;USF
Isotretinoína 20 MG;CEAF
Itraconazol 100 MG;USF
Ivacaftor 150 MG;CEAF
Lactulose 667 MG/ML;USF
Lamivudina 10 MG/ML;CTA/SAE
Lamivudina 150 MG;CTA/SAE
Lamotrigina 25 MG;CEAF
Lamotrigina 50 MG;CEAF
Lamotrigina 100 MG;CEAF
Lancetas para Monitoramento de Glicemia Capilar;USF
Lanreotida, Acetato 60 MG;CEAF
Lanreotida, Acetato 90 MG;CEAF
Lanreotida, Acetato 120 MG;CEAF
Laronidase 0,58 MG/ML;CEAF
Latanoprosta 0,05 MG/ML;CEAF
Leflunomida 20 MG;CEAF
Leuprorrelina, Acetato 3,75 MG;CEAF
Leuprorrelina, Acetato 45 MG;CEAF
Levetiracetam 1.000 MG;CEAF
Levetiracetam 100 MG/ML;CEAF
Levetiracetam 250 MG;CEAF
Levetiracetam 500 MG;CEAF
Levetiracetam 750 MG;CEAF
Levodopa + Benserazida 100 MG + 25 MG;USF
Levodopa + Benserazida 200 MG + 50 MG;USF
Levofloxacino 500 MG;CTA/SAE
Levomepromazina 100 MG;FARMÁCIA POLO
Levomepromazina 25 MG;FARMÁCIA POLO
Levomepromazina 40 MG/ML;FARMÁCIA POLO
Levonorgestrel + Etinilestradiol 0,15 + 0,03 MG;USF
Levonorgestrel 0,75 MG;USF
Levotiroxina Sódica 100 MCG;USF
Levotiroxina Sódica 25 MCG;USF
Lidocaína, Cloridrato 20 MG/G;USF
Loratadina 1 MG/ML;USF
Loratadina 10 MG;USF
Losartana Potássica 50 MG;USF
Maraviroque 150 MG;CTA/SAE
Medroxiprogesterona, Acetato 150 MG/ML;USF
Memantina, Cloridrato 10 MG;CEAF
Mepolizumabe 100 MG/ML;CEAF
Mesalazina 400 MG;CEAF
Mesalazina 500 MG;CEAF
Mesalazina 800 MG;CEAF
Metadona, Cloridrato 5 MG;CEAF
Metadona, Cloridrato 10 MG;CEAF
Metformina, Cloridrato 500 MG;USF
Metformina, Cloridrato 850 MG;USF
Metildopa 250 MG;USF
Metilfenidato, Cloridrato 10 MG;FARMÁCIA POLO
Metoprolol, Succinato 25 MG;USF
Metotrexato 2,5 MG;CEAF
Metotrexato 25 MG/ML;CEAF
Metronidazol 100 MG/G;USF
Metronidazol 250 MG;USF
Micofenolato de Mofetila 180 MG;CEAF
Micofenolato de Mofetila 360 MG;CEAF
Micofenolato de Mofetila 500 MG;CEAF
Miconazol, Nitrato 20 MG/G;USF
Miglustate 100 MG;CEAF
Morfina, Sulfato 10 MG;CEAF
Morfina, Sulfato 30 MG;CEAF
Morfina, Sulfato 30 MG;CEAF
Morfina, Sulfato 60 MG;CEAF
Natalizumabe 300 MG;CEAF
Nevirapina 200 MG;CTA/SAE
Nicotina 2 MG;USF
Nicotina 7 MG;USF
Nicotina 14 MG;USF
Nicotina 21 MG;USF
Nistatina 100.000 UI/ML;USF
Nitrofurantoína 100 MG;USF
Noretisterona 0,35 MG;USF
Noretisterona, Enantato + Estradiol, Valerato 50 MG/ML + 5 MG/ML;USF
Nortriptilina, Cloridrato 25 MG;USF
Nusinersena 2,4 MG/ML;CEAF
Octreotida LAR 10 MG;CEAF
Octreotida LAR 20 MG;CEAF
Octreotida LAR 30 MG;CEAF
Ofloxacino 400 MG;CTA/SAE
Olanzapina 5 MG;CEAF
Olanzapina 10 MG;CEAF
Óleo Mineral;USF
Omalizumabe 150 MG;CEAF
Omeprazol 20 MG;USF
Ondansetrona, Cloridrato 4 MG;USF
Oseltamivir, Fosfato 30 MG;CESAF
Oseltamivir, Fosfato 45 MG;CESAF
Oseltamivir, Fosfato 75 MG;CESAF
Oxcarbazepina 300 MG;FARMÁCIA POLO
Oxcarbazepina 60 MG/ML;FARMÁCIA POLO
OxiButinina 5 MG;ESAF
Pancreatina 10.000 UI;CEAF
Pancreatina 25.000 UI;CEAF
Paracetamol + Codeína, Fosfato 500 + 30 MG;FARMÁCIA POLO
Paracetamol 200 MG/ML;USF
Paracetamol 500 MG;USF
Paricalcitol 5,0 MCG/ML;CEAF
Paroxetina 20 MG;FARMÁCIA POLO
Penicilamina 250 MG;CEAF
Pentoxifilina 400 MG;CTA/SAE
Periciazina 10 MG/ML;FARMÁCIA POLO
Periciazina 40 MG/ML;FARMÁCIA POLO
Permetrina 50 MG/ML;USF
Pirazinamida 150 MG;USF
Pirazinamida 30 MG/ML;USF
Pirazinamida 500 MG;USF
Piridostigmina, Brometo 60 MG;CEAF
Piridoxina, Cloridrato 50 MG;CTA/SAE
Pirimetamina 25 MG;CESAF
Pramipexol, Dicloridrato 0,125 MG;CEAF
Pramipexol, Dicloridrato 0,25 MG;CEAF
Pramipexol, Dicloridrato 1 MG;CEAF
Praziquantel 600 MG;CESAF
Prednisolona, Fosfato Sódico 3 MG/ML;USF
Prednisona 20 MG;USF
Prednisona 5 MG;USF
Pregabalina 75 MG;FARMÁCIA POLO
Preservativo Feminino;USF
Primaquina, Difosfato 5 MG;CESAF
Primaquina, Difosfato 15 MG;CESAF
Prometazina, Cloridrato 25 MG;USF
Prometazina, Cloridrato 25 MG/ML;USF
Propatilnitrato 10 MG;CAF
Propranolol, Cloridrato 40 MG;USF
Quetiapina, Hemifumarato 25 MG;CEAF
Quetiapina, Hemifumarato 100 MG;CEAF
Quetiapina, Hemifumarato 200 MG;CEAF
Quetiapina, Hemifumarato 300 MG;CEAF
Raloxifeno, Cloridrato 60 MG;CEAF
Raltegravir Potássico 400 MG;CTA/SAE
Rasagilina, Mesilato 1 MG;CEAF
Retinol, Palmitato 100.000 UI;USF
Retinol, Palmitato 200.000 UI;USF
Rifambutina 150 MG;CESAF
Rifampicina + Clofazimina + Dapsona (PQT) 150 MG/300 MG + 50 MG/50 MG;USF
Rifampicina + Clofazimina + Dapsona (PQT) 300 MG/100 + 50 MG/100 MG;USF
Rifampicina + Isoniazida + Pirazinamida + Etambutol 150 MG + 75 MG + 400 MG + 275 MG;USF
Rifampicina + Isoniazida + Pirazinamida 75 MG + 50 MG + 150 MG;USF
Rifampicina + Isoniazida 150 MG + 75 MG;USF
Rifampicina + Isoniazida 300 MG + 150 MG;USF
Rifampicina 20 MG/ML;USF
Rifampicina 300 MG;USF
Rifapentina 150 MG;USF
Rifapentina 300 MG + Isoniazida 300 MG;USF
Riluzol 50 MG;CEAF
Risanquizumabe 90 MG/ML;CEAF
Risedronato Sódico 35 MG;CEAF
Risperidona 1 MG;CEAF
Risperidona 1 MG/ML;CEAF
Risperidona 2 MG;CEAF
Risperidona 3 MG;CEAF
Ritonavir 100 MG;CTA/SAE
Rituximabe 500 MG;CEAF
Rivastigmina 1,5 MG;CEAF
Rivastigmina 2 MG/ML;CEAF
Rivastigmina 3 MG;CEAF
Rivastigmina 4,5 MG;CEAF
Rivastigmina 6 MG;CEAF
Rivastigmina 9 MG;CEAF
Rivastigmina 18 MG;CEAF
Sacarato de Hidróxido Férrico 100 MG;CEAF
Sacubitril Valsartana Sódica Hidratada 50 MG;CEAF
Sacubitril Valsartana Sódica Hidratada 100 MG;CEAF
Sacubitril Valsartana Sódica Hidratada 200 MG;CEAF
Sais para Reidrataçăo Oral;USF
Salbutamol, Sulfato 100 MCG/DOSE;USF
Sapropterina, Dicloridrato 100 MG;CEAF
Secuquinumabe 150 MG/ML;CEAF
Seringa com Agulha Acoplada para Aplicaçăo de Insulina 50 UI;USF
Sertralina, Cloridrato 50 MG;FARMÁCIA POLO
Sevelamer, Cloridrato 800 MG;CEAF
Sildenafila, Citrato 20 MG;CEAF
Sildenafila, Citrato 25 MG;CEAF
Sildenafila, Citrato 50 MG;CEAF
Sinvastatina 20 MG;USF
Sirolimo 1 MG;CEAF
Sofosbuvir + Velpatasvir 400 MG + 100 MG;CTA/SAE
Sofosbuvir 400 MG;CTA/SAE
Somatropina 4 UI;CEAF
Somatropina 12 UI;CEAF
Somatropina 16 UI;CEAF
Sulfadiazina 500 MG;CESAF
Sulfadiazina de Prata 10 MG/ML;USF
Sulfametoxazol + Trimetoprima 40 MG/ML + 8 MG/ML;USF
Sulfametoxazol + Trimetoprima 400 MG + 80 MG;USF
Sulfassalazina 500 MG;CEAF
Sulfato Ferroso 125 MG/ML;USF
Sulfato Ferroso 40 MG;USF
Tacrolimo 1 MG;CEAF
Tacrolimo 5 MG;CEAF
Tafamidis 20 MG;CEAF
Talidomida 100 MG;USF
Tenofovir Desoproxila, Fumarato + Emtricitabina 300 MG + 200 MG;CTA/SAE
Tenofovir Desoproxila, Fumarato 300 MG;CTA/SAE
Tenofovir Desoproxila, Fumarato + Lamivudina + Efavirenz 300 MG + 300 MG + 600 MG;CTA/SAE
Tenofovir Desoproxila, Fumarato + Lamivudina 300 MG;CTA/SAE
Teriflunomida 14 MG;CEAF
Tiamina, Cloridrato 300 MG;CAF
Timolol, Maleato 5 MG/ML;CAF
Tiras para Monitoramento de Glicemia;CAF
Tobramicina 300 MG/5 ML;CEAF
Tocilizumabe 20 MG/ML;CEAF
Tofacitinibe 5 MG;CEAF
Topiramato 25 MG;CEAF
Topiramato 50 MG;CEAF
Topiramato 100 MG;CEAF
Toxina Botulínica Tipo A 100 UI;CEAF
Toxina Botulínica Tipo A 500 UI;CEAF
Travoprosta 0,04 MG/ML;CEAF
Trientina, Dicloridrato 250 MG;CEAF
Triexifenidil, Cloridrato 5 MG;CEAF
Triptorrelina, Embonato 3,75 MG;CEAF
Triptorrelina, Embonato 11,25 MG;CEAF
Triptorrelina, Embonato 22,5 MG;CEAF
Upadacitinibe 15 MG;CEAF
Ustequinumabe 45 MG/0,5 ML;CEAF
Vacina Adsorvida Difteria e Tétano Adulto;USF
Vacina Adsorvida Difteria, Tétano e Pertussis;USF
Vacina Adsorvida Difteria, Tétano e Pertussis (Acelular) Adulto;USF
Vacina Adsorvida Difteria, Tétano e Pertussis (Acelular) Infantil;USF
Vacina Adsorvida Difteria, Tétano, Pertussis, Hepatite B (Recombinante) e Haemophilus Influenzae B (Conjugada);USF
Vacina Adsorvida Hepatite A (Inativada) Adulto;USF
Vacina Adsorvida Hepatite A (Inativada) Infantil;USF
Vacina BCG;USF
Vacina Contra Raiva Animal;USF
Vacina Contra Raiva Humana;USF
Vacina Febre Amarela (Atenuada);USF
Vacina Gripe (Influenza);USF
Vacina Haemophilus Influenzae B (Conjugada);USF
Vacina Hepatite B (Recombinante);USF
Vacina Meningocócica ACWY (Conjugada);USF
Vacina Meningocócica C (Conjugada);USF
Vacina Papilomavírus Humano 6,11,16 e 18 (Recombinante);USF
Vacina Pneumocócica 10-Valente (Conjugada);USF
Vacina Pneumocócica 13-Valente (Conjugada);USF
Vacina Pneumocócica 23-Valente (Polissacarídica);USF
Vacina Poliomielite 1,2 e 3 (Inativada);USF
Vacina Rotavírus Humano G1P [8] (Atenuada);USF
Vacina Sarampo, Caxumba, Rubéola (Tríplice Viral);USF
Vacina Sarampo, Caxumba, Rubéola, Varicela (Tetra Viral);USF
Vacina Varicela (Atenuada);USF
Varfarina Sódica 5 MG;USF
Vedolizumabe 300 MG;CEAF
Venlafaxina 150 MG;FARMÁCIA POLO
Venlafaxina 75 MG;FARMÁCIA POLO
Vigabatrina 500 MG;CEAF
Zidovudina + Lamivudina 300 MG + 150 MG;CESAF
Zidovudina 100 MG;CESAF
Zidovudina 10 MG/ML;CESAF
Ziprasidona, Cloridrato 40 MG;CEAF
Ziprasidona, Cloridrato 80 MG;CEAF`;

  const linhas = csvData.split('\n');
  for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;
    const linha = linhas[i];
    const campos = [];
    let dentroAspas = false;
    let campoAtual = '';
    for (let j = 0; j < linha.length; j++) {
      const char = linha[j];
      if (char === '"') { dentroAspas = !dentroAspas; }
      else if (char === ';' && !dentroAspas) { campos.push(campoAtual); campoAtual = ''; }
      else { campoAtual += char; }
    }
    campos.push(campoAtual);
    if (campos.length >= 2) {
      medicamentosDict.push({ nome: campos[0].trim(), local: campos[1].trim().replace(/"/g, '') });
    }
  }
  medicamentosDict.sort((a, b) => a.nome.localeCompare(b.nome));

}

// ============================================
// COMPONENTE DE AUTOCOMPLETE
// ============================================

class AutocompleteMedicamento {
  constructor(inputEl, options = {}) {
    this.input = typeof inputEl === 'string' ? $id(inputEl) : inputEl;
    if (!this.input) return;
    this.options = { maxResults: 10, minChars: 2, debounceTime: 300, onSelect: null, ...options };
    this.suggestionsContainer = null;
    this.selectedIndex = -1;
    this.currentSuggestions = [];
    this.debounceTimer = null;
    this.isVisible = false;
    this.init();
  }

  init() {
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'autocomplete-suggestions';
    // z-index must exceed any modal (openModal max is ~1000+N*10).
    // Using 99999 but also setting via style so it wins over any CSS modal rules.
    this.suggestionsContainer.style.cssText = 'position:fixed;z-index:999999;max-height:280px;overflow-y:auto;background:var(--surface);border:1px solid var(--bdr-strong);border-radius:var(--r-sm);box-shadow:var(--sh-lg);display:none;min-width:220px;';
    document.body.appendChild(this.suggestionsContainer);
    this._positionDropdown = () => {
      const r = this.input.getBoundingClientRect();
      // With position:fixed, coords are always relative to viewport — no root offset needed
      this.suggestionsContainer.style.left  = r.left + 'px';
      this.suggestionsContainer.style.top   = (r.bottom + 2) + 'px';
      this.suggestionsContainer.style.width = r.width + 'px';
    };
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
    // delay maior para o click no item processar antes do hide
    this.input.addEventListener('blur', () => setTimeout(() => { if (!this.suggestionsContainer.matches(':hover')) this.hide(); }, 300));
    this.input.addEventListener('focus', () => { if (this.input.value.length >= this.options.minChars) this.search(this.input.value); });
    document.addEventListener('click', (e) => { if (!this.input.contains(e.target) && !this.suggestionsContainer.contains(e.target)) this.hide(); });
    window.addEventListener('resize', this._positionDropdown);
    window.addEventListener('scroll', this._positionDropdown, true);
  }

  handleInput() {
    clearTimeout(this.debounceTimer);
    const value = this.input.value.trim();
    if (value.length < this.options.minChars) { this.hide(); return; }
    this.debounceTimer = setTimeout(() => this.search(value), this.options.debounceTime);
  }

  handleKeyDown(e) {
    if (!this.isVisible) return;
    const suggestions = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.selectedIndex = Math.min(this.selectedIndex + 1, suggestions.length - 1); this.updateSelection(suggestions); break;
      case 'ArrowUp':  e.preventDefault(); this.selectedIndex = Math.max(this.selectedIndex - 1, -1); this.updateSelection(suggestions); break;
      case 'Enter':    e.preventDefault(); if (this.selectedIndex >= 0 && suggestions[this.selectedIndex]) this.selectSuggestion(this.currentSuggestions[this.selectedIndex]); break;
      case 'Escape':   this.hide(); break;
    }
  }

  updateSelection(suggestions) {
    suggestions.forEach((s, i) => {
      s.classList.toggle('selected', i === this.selectedIndex);
      if (i === this.selectedIndex) s.scrollIntoView({ block: 'nearest' });
    });
  }

  search(query) {
    if (!medicamentosDict || medicamentosDict.length === 0) return;
    const termos = query.toLowerCase().split(' ').filter(t => t.length > 0);
    const resultados = medicamentosDict.map(med => {
      const nomeLower = med.nome.toLowerCase();
      let score = 0;
      if (nomeLower === query.toLowerCase()) score = 100;
      else if (nomeLower.startsWith(query.toLowerCase())) score = 80;
      else {
        const encontrados = termos.filter(t => nomeLower.includes(t));
        score = (encontrados.length / termos.length) * 60;
        if (termos.some(t => nomeLower.includes(' ' + t + ' '))) score += 10;
      }
      return { ...med, score };
    }).filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, this.options.maxResults);
    this.currentSuggestions = resultados;
    this.renderSuggestions(resultados);
  }

  destacarTermos(texto, query) {
    const termos = query.toLowerCase().split(' ').filter(t => t.length > 0);
    let result = texto;
    termos.forEach(termo => {
      const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<strong style="background:var(--amarelo-fraco);color:var(--amarelo)">$1</strong>');
    });
    return result;
  }

  renderSuggestions(resultados) {
    if (resultados.length === 0) { this.hide(); return; }
    this.suggestionsContainer.innerHTML = resultados.map((med, i) => `
      <div class="suggestion-item${i === this.selectedIndex ? ' selected' : ''}" data-index="${i}"
           data-medicamento='${JSON.stringify(med).replace(/'/g, "&apos;")}'
           style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--cinza-200)">
        <div style="font-weight:500">${this.destacarTermos(esc(med.nome), esc(this.input.value))}</div>
        <div style="font-size:var(--text-xs);color:var(--cinza-500)">${esc(med.local)}</div>
      </div>`).join('');
    this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const medData = JSON.parse(item.dataset.medicamento.replace(/&apos;/g, "'"));
        this.selectSuggestion(medData);
      });
      item.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.updateSelection(this.suggestionsContainer.querySelectorAll('.suggestion-item'));
      });
    });
    this._positionDropdown();
    this.suggestionsContainer.style.display = 'block';
    this.isVisible = true;
  }

  selectSuggestion(med) {
    this.input.value = med.nome;
    this.input.dispatchEvent(new CustomEvent('medicamento-selecionado', { detail: { medicamento: med } }));
    if (this.options.onSelect) this.options.onSelect(med);
    this.hide();
  }

  hide() { this.suggestionsContainer.style.display = 'none'; this.isVisible = false; this.selectedIndex = -1; }
  show() { if (this.currentSuggestions.length > 0) { this._positionDropdown(); this.suggestionsContainer.style.display = 'block'; this.isVisible = true; } }
  destroy() {
    this.hide();
    if (this.suggestionsContainer && this.suggestionsContainer.parentNode) {
      this.suggestionsContainer.parentNode.removeChild(this.suggestionsContainer);
    }
    window.removeEventListener('resize', this._positionDropdown);
    window.removeEventListener('scroll', this._positionDropdown, true);
  }
}

// ============================================
// FUNÇÕES DE MEDICAÇÕES COM AUTOCOMPLETE
// ============================================

// Registry de instâncias de autocomplete — declarado junto com _tempMeds (linha ~7159)
// para evitar TDZ quando renderMedicacoesList é chamada antes desta linha.

function renderMedicacoesList(meds) {
  // Destroy previous autocomplete instances to avoid orphan dropdowns
  _acInstances.forEach(ac => { try { ac.destroy(); } catch(e){} });
  _acInstances = [];
  _tempMeds = meds ? deepClone(meds) : [];
  const el = $id('lista-medicacoes');
  if (!el) return;
  if (_tempMeds.length === 0) {
    el.innerHTML = '<div style="font-size:var(--text-sm);color:var(--cinza-500);padding:16px;text-align:center;border:2px dashed var(--slate-200);border-radius:8px">Nenhuma medicação cadastrada.</div>';
    return;
  }
  el.innerHTML = _tempMeds.map((m, idx) => `
    <div style="display:grid;grid-template-columns:1fr 116px 32px;gap:6px;align-items:end;padding:8px 10px;background:white;border:1px solid var(--slate-200);border-radius:8px;border-left:3px solid var(--violet-500)">
      <div style="position:relative;min-width:0">
        <div style="font-size:10.5px;font-weight:600;color:var(--slate-400);margin-bottom:3px">💊 Medicamento</div>
        <input class="input medicamento-autocomplete"
               style="font-size:var(--text-sm);padding:6px 8px;height:36px;width:100%"
               value="${esc(m.nome || '')}"
               data-index="${idx}"
               placeholder="Nome do medicamento..."
               oninput="atualizarMedicamento(${idx}, this.value)">
        ${m.localAcesso ? `<div style="font-size:var(--text-2xs);color:var(--slate-400);margin-top:2px">📍 ${esc(m.localAcesso)}</div>` : ''}
      </div>
      <div>
        <div style="font-size:10.5px;font-weight:600;color:var(--slate-400);margin-bottom:3px">🔄 Frequência</div>
        <select class="input" style="font-size:var(--text-xs);padding:5px 4px;height:36px;width:100%" onchange="atualizarFreqMedicamento(${idx}, this.value)">
          ${['1x/dia','2x/dia','3x/dia','4x/dia','Conf. necessário','Semanal','Mensal'].map(o => `<option ${(m.freq===o||m.freq===o.replace('/dia',''))?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>
      <button onclick="_tempMeds.splice(${idx},1);renderMedicacoesList(_tempMeds)"
              style="width:32px;height:36px;border:none;background:var(--rose-bg);color:var(--vermelho);border-radius:6px;cursor:pointer;font-size:var(--text-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0"
              title="Remover">✕</button>
    </div>`).join('');

  setTimeout(() => {
    el.querySelectorAll('.medicamento-autocomplete').forEach(input => {
      if (!input.hasAttribute('data-ac-init')) {
        input.setAttribute('data-ac-init', 'true');
        const ac = new AutocompleteMedicamento(input, {
          onSelect: (med) => {
            const index = parseInt(input.dataset.index);
            _tempMeds[index].nome = med.nome;
            _tempMeds[index].localAcesso = med.local;
            input.value = med.nome;
            const card = input.closest('div[style*="border-left"]');
            const infoDiv = card ? card.querySelector('.med-local-info') : null;
            if (infoDiv) infoDiv.textContent = `📍 ${med.local || ''}`;
          }
        });
        _acInstances.push(ac);
      }
    });
  }, 50);
}

function atualizarMedicamento(index, valor) { if (_tempMeds[index]) _tempMeds[index].nome = valor; }
function atualizarFreqMedicamento(index, valor) { if (_tempMeds[index]) _tempMeds[index].freq = valor; }

function adicionarMedicacao() {
  _tempMeds.push({ nome: '', freq: '1x', localAcesso: '' });
  renderMedicacoesList(_tempMeds);
  setTimeout(() => {
    const inputs = document.querySelectorAll('.medicamento-autocomplete');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 100);
}

function coletarMedicacoes() {
  return _tempMeds.filter(m => m.nome && m.nome.trim());
}

// CSS do autocomplete
const autocompleteStyles = `
  .autocomplete-suggestions { animation: fadeIn 0.2s ease; }
  .autocomplete-suggestions .suggestion-item:hover,
  .autocomplete-suggestions .suggestion-item.selected { background: var(--cinza-100); }
  .autocomplete-suggestions .suggestion-item:last-child { border-bottom: none !important; }
  .medicamento-autocomplete {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 32px;
  }
  .medicamento-info { transition: all 0.2s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
`;
const _acStyle = document.createElement('style');
_acStyle.textContent = autocompleteStyles;
document.head.appendChild(_acStyle);

carregarMedicamentosCSV();
function customConfirm(msg, onOk) {
  const modal     = $id('confirm-modal');
  const msgEl     = $id('confirm-msg');
  const okBtn     = $id('confirm-ok');
  const cancelBtn = $id('confirm-cancel');

  // ── Modo Promise (sem callback) — usado por auth.js com await ──────────────
  if (typeof onOk !== 'function') {
    return new Promise(function(resolve) {
      if (!modal || !msgEl || !okBtn || !cancelBtn) {
        resolve(window.confirm(msg));
        return;
      }
      msgEl.textContent = msg;
      openModal('confirm-modal');
      function _ok() {
        _cleanup();
        closeModal('confirm-modal');
        resolve(true);
      }
      function _cancel() {
        _cleanup();
        closeModal('confirm-modal');
        resolve(false);
      }
      function _cleanup() {
        okBtn.removeEventListener('click', _ok);
        cancelBtn.removeEventListener('click', _cancel);
        okBtn.onclick = null;
        cancelBtn.onclick = null;
      }
      // Usa addEventListener com { once } para não acumular handlers
      okBtn.onclick     = null;
      cancelBtn.onclick = null;
      okBtn.addEventListener('click', _ok, { once: true });
      cancelBtn.addEventListener('click', _cancel, { once: true });
    });
  }

  // ── Modo callback — usado por app-crud.js e outros ────────────────────────
  if (!modal || !msgEl || !okBtn || !cancelBtn) {
    if (window.confirm(msg)) onOk();
    return;
  }
  msgEl.textContent = msg;
  openModal('confirm-modal');
  okBtn.onclick = function() {
    closeModal('confirm-modal');
    onOk();
  };
  cancelBtn.onclick = function() {
    closeModal('confirm-modal');
  };
}

// ── Overrides de exclusão — usam customConfirm e render lazy (não bloqueiam UI no Android) ──
// Nota: excluirIndividuo e excluirFamilia são definidos em app-crud.js com a lógica completa.
// Estes overrides apenas garantem que customConfirm seja usado (não window.confirm nativo).
// A lógica de dados fica centralizada no app-crud.js.

const _excluirIndividuoOrig = excluirIndividuo;
window.excluirIndividuo = function(id) {
  customConfirm('Excluir este membro?', function() {
    const i = getIndividuo(id);
    if (!i) return;
    delete db.individuoById[Number(i.idIndividuo)];
    const f = getFamilia(i.familiaId);
    if (f) {
      f.membros = getIndividuos().filter(x => x.familiaId === i.familiaId).length;
      if (f.responsavelId == i.idIndividuo) f.responsavelId = null;
      if (f.individuos) f.individuos = f.individuos.filter(x => x != i.idIndividuo);
    }
    save();
    if (typeof invalidarCachePendencias === 'function') invalidarCachePendencias();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    if (typeof toast === 'function') toast('Indivíduo excluído 🗑', '');
  });
};

// excluirFamilia: NÃO exclui o domicílio pai — apenas a família e seus membros.
// (O override anterior tinha um bug crítico: deletava o domicílio junto.)
const _excluirFamiliaOrig = excluirFamilia;
window.excluirFamilia = function(id) {
  customConfirm('Excluir esta família e seus membros?', function() {
    const fam = getFamilia(id);
    // Remove membros
    Object.keys(db.individuoById || {}).forEach(k => {
      const ind = db.individuoById[k];
      if (ind && ind.familiaId == id) delete db.individuoById[k];
    });
    // Desvincula do domicílio (sem excluí-lo)
    if (fam && fam.domicilioId) {
      const d = getDomicilio ? getDomicilio(fam.domicilioId) : db.domicilioById[fam.domicilioId];
      if (d && d.familias) d.familias = d.familias.filter(fid => fid != id);
    }
    delete db.familiaById[Number(id)];
    save();
    if (typeof invalidateFamiliaSelects === 'function') invalidateFamiliaSelects();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    if (typeof toast === 'function') toast('Família excluída 🗑', '');
  });
};

window.excluirPendencia = function(id) {
  customConfirm('Excluir esta pendência?', function() {
    db.pendencias = db.pendencias.filter(p => p.id !== id);
    save();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  });
};

// Render foi movido para antes da linha ~9930 onde começa a ser referenciado.

// ============================================
