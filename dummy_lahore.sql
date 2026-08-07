
-- 1. CLEANUP OLD SCHEMA IF IT HAD PRESENCE Enum values
-- (This ensures the new schema cleanly applies)
TRUNCATE TABLE public.reports;
TRUNCATE TABLE public.report_submissions_log;

-- 2. APPLY NEW SCHEMA (from schema.md)
-- ... I will just tell the user to run schema.md first, then run this.

-- 3. INSERT DUMMY DATA FOR LAHORE
INSERT INTO public.reports (
  latitude, longitude, geohash, accuracy_meters, is_manual_pin, 
  operator, speed_source, download_mbps, upload_mbps, ping_ms, 
  device_fingerprint, ip_hash, trust_score, status
)
VALUES
(
      31.560334404857485, 74.31913292902694, 'ttsge1ms3', 10, false, 'Zong', 'mobile', 179.00, 25.0, 15, 
      'dummy-fingerprint-0.5326573456110468', 'dummy-ip-0.033533429246002555', 0.95, 'visible'
    ),
(
      31.565798190928305, 74.31565505689122, 'ttsge47h0', 10, false, 'Zong', 'mobile', 215.00, 25.0, 15, 
      'dummy-fingerprint-0.8360289785244452', 'dummy-ip-0.4575394416597087', 0.95, 'visible'
    ),
(
      31.562839670086234, 74.3204095169525, 'ttsge1y6z', 10, false, 'Zong', 'mobile', 187.56, 25.0, 15, 
      'dummy-fingerprint-0.14056489320441679', 'dummy-ip-0.46179857378656197', 0.95, 'visible'
    ),
(
      31.562459556363514, 74.32390391548742, 'ttsge3c08', 10, false, 'Zong', 'mobile', 163.66, 25.0, 15, 
      'dummy-fingerprint-0.6776494292721009', 'dummy-ip-0.6025505167207035', 0.95, 'visible'
    ),
(
      31.565356585672607, 74.31572108984498, 'ttsge4719', 10, false, 'Zong', 'mobile', 179.37, 25.0, 15, 
      'dummy-fingerprint-0.0017171321264985995', 'dummy-ip-0.38270618517251553', 0.95, 'visible'
    ),
(
      31.561775228143592, 74.3180088841987, 'ttsge1ssx', 10, false, 'Jazz', 'mobile', 47.01, 25.0, 15, 
      'dummy-fingerprint-0.8569335613875142', 'dummy-ip-0.6931400629517026', 0.95, 'visible'
    ),
(
      31.56734596471362, 74.31707192685668, 'ttsge4sj1', 10, false, 'Jazz', 'mobile', 51.38, 25.0, 15, 
      'dummy-fingerprint-0.4044014338159998', 'dummy-ip-0.5022159441204603', 0.95, 'visible'
    ),
(
      31.56221248850089, 74.31598743990743, 'ttsge1er0', 10, false, 'Jazz', 'mobile', 76.19, 25.0, 15, 
      'dummy-fingerprint-0.07603823284221001', 'dummy-ip-0.6802208846265683', 0.95, 'visible'
    ),
(
      31.566014448575114, 74.31933536690265, 'ttsge4mtq', 10, false, 'Jazz', 'mobile', 47.31, 25.0, 15, 
      'dummy-fingerprint-0.1651878852576072', 'dummy-ip-0.43012194827340955', 0.95, 'visible'
    ),
(
      31.568683319809473, 74.32013046646024, 'ttsge4ykb', 10, false, 'Ufone', 'mobile', 226.68, 25.0, 15, 
      'dummy-fingerprint-0.3633179418027366', 'dummy-ip-0.8536534993136236', 0.95, 'visible'
    ),
(
      31.56597846760661, 74.32266455951938, 'ttsge62j5', 10, false, 'Ufone', 'mobile', 243.58, 25.0, 15, 
      'dummy-fingerprint-0.20808407385939542', 'dummy-ip-0.02815776738662179', 0.95, 'visible'
    ),
(
      31.56677741005991, 74.31624072517018, 'ttsge4e3v', 10, false, 'Ufone', 'mobile', 238.03, 25.0, 15, 
      'dummy-fingerprint-0.05788173188521073', 'dummy-ip-0.8544973049986817', 0.95, 'visible'
    ),
(
      31.56286524071025, 74.31877035254199, 'ttsge1v70', 10, false, 'Jazz', 'mobile', 169.94, 25.0, 15, 
      'dummy-fingerprint-0.009825136079531172', 'dummy-ip-0.7813257931945752', 0.95, 'visible'
    ),
(
      31.562402116610475, 74.31126609126606, 'ttsgdczb6', 10, false, 'Jazz', 'mobile', 163.36, 25.0, 15, 
      'dummy-fingerprint-0.2588934726927603', 'dummy-ip-0.6599829586696082', 0.95, 'visible'
    ),
(
      31.55762957294419, 74.31473497459001, 'ttsge0fkd', 10, false, 'Jazz', 'mobile', 172.59, 25.0, 15, 
      'dummy-fingerprint-0.017596437520845276', 'dummy-ip-0.5556413432919964', 0.95, 'visible'
    ),
(
      31.556693056383672, 74.31108555644116, 'ttsgdbxxj', 10, false, 'Jazz', 'mobile', 168.38, 25.0, 15, 
      'dummy-fingerprint-0.5917049957273044', 'dummy-ip-0.5310859526445908', 0.95, 'visible'
    ),
(
      31.56498325936086, 74.31313686389554, 'ttsge41pm', 10, false, 'Jazz', 'mobile', 149.44, 25.0, 15, 
      'dummy-fingerprint-0.30376510325038275', 'dummy-ip-0.4884797694701586', 0.95, 'visible'
    ),
(
      31.558514434589135, 74.31023485796042, 'ttsgdcp19', 10, false, 'Jazz', 'mobile', 147.59, 25.0, 15, 
      'dummy-fingerprint-0.35403706556936854', 'dummy-ip-0.7519982976835582', 0.95, 'visible'
    ),
(
      31.563613291115626, 74.31075872309242, 'ttsgdczrq', 10, false, 'Zong', 'mobile', 23.01, 25.0, 15, 
      'dummy-fingerprint-0.8238268905315735', 'dummy-ip-0.2479433958179158', 0.95, 'visible'
    ),
(
      31.558129745412153, 74.31173636825328, 'ttsge0bpk', 10, false, 'Zong', 'mobile', 46.17, 25.0, 15, 
      'dummy-fingerprint-0.4719889815608229', 'dummy-ip-0.033055268208392', 0.95, 'visible'
    );
