INSERT INTO facilities (name,type,lat,lng,phone,license,verified) VALUES
('Govt Hospital A','Hospital',17.4065,78.4772,'040-24000001','GOV-H-A',true),
('Govt Hospital B','Hospital',17.3850,78.4867,'040-24000002','GOV-H-B',true),
('City Government Dispensary','Dispensary',17.4120,78.4500,'040-24000003','GOV-D-01',true),
('MediCare Pharmacy','Pharmacy',17.4000,78.4700,'9000000004','DL-2026-004',true),
('LifeLine Pharmacy','Pharmacy',17.4250,78.4900,'9000000005','DL-2026-005',true),
('Govt Hospital C','Hospital',17.3950,78.4750,'040-24000006','GOV-H-C',true),
('Central Dispensary','Dispensary',17.4100,78.4800,'040-24000007','GOV-D-02',true),
('Jan Aushadhi Point','Pharmacy',17.3900,78.4600,'9000000008','DL-2026-008',true)
ON CONFLICT (license) DO NOTHING;

INSERT INTO medicines (name,strength) VALUES
('Insulin','40 IU'),
('Paracetamol','650 mg'),
('Amoxicillin','500 mg'),
('Azithromycin','500 mg'),
('ORS','21 g'),
('Salbutamol','4 mg'),
('Metformin','500 mg'),
('Aspirin','75 mg'),
('Cefixime','200 mg'),
('Doxycycline','100 mg')
ON CONFLICT (name,strength) DO NOTHING;

INSERT INTO inventory (facility_id,medicine_id,quantity,expiry)
SELECT f.id,m.id,v.quantity,v.expiry::date
FROM (VALUES
 ('GOV-H-A','Insulin','40 IU',25,'2027-02-10'),
 ('GOV-H-A','Paracetamol','650 mg',120,'2027-05-10'),
 ('GOV-H-A','Metformin','500 mg',60,'2027-08-20'),
 ('GOV-H-B','Insulin','40 IU',5,'2026-12-12'),
 ('GOV-H-B','Amoxicillin','500 mg',18,'2027-01-15'),
 ('GOV-H-B','Salbutamol','4 mg',45,'2027-03-12'),
 ('GOV-D-01','Insulin','40 IU',8,'2026-11-20'),
 ('GOV-D-01','Paracetamol','650 mg',50,'2027-04-02'),
 ('DL-2026-004','Insulin','40 IU',15,'2027-03-03'),
 ('DL-2026-004','Paracetamol','650 mg',80,'2027-06-01'),
 ('DL-2026-005','Amoxicillin','500 mg',35,'2027-02-25'),
 ('DL-2026-005','Azithromycin','500 mg',22,'2027-07-14'),
 ('GOV-H-C','Insulin','40 IU',40,'2027-08-15'),
 ('GOV-H-C','Azithromycin','500 mg',55,'2027-10-12'),
 ('GOV-H-C','Cefixime','200 mg',75,'2027-09-01'),
 ('GOV-D-02','ORS','21 g',150,'2027-11-30'),
 ('GOV-D-02','Salbutamol','4 mg',12,'2027-05-18'),
 ('DL-2026-008','Metformin','500 mg',45,'2027-12-01'),
 ('DL-2026-008','Aspirin','75 mg',90,'2028-01-20'),
 ('DL-2026-008','Doxycycline','100 mg',28,'2027-06-30')
) AS v(license,name,strength,quantity,expiry)
JOIN facilities f ON f.license=v.license
JOIN medicines m ON m.name=v.name AND m.strength=v.strength
ON CONFLICT (facility_id,medicine_id) DO NOTHING;
