%%%%%%%%
function [m,p,mss] = readmodel_uzb()

% PARAMETRIZE AND SOLVE THE MODEL FOR UZBEKISTAN

%% === Steady state parameters (UZB Specific) ===
% Potential output growth (New Uzbekistan structural trend)
p.ss_DLA_GDP_BAR = 6.0; 

% Domestic inflation target (CBU Medium-term target)
p.ss_D4L_CPI_TAR = 5.0; 

% Domestic neutral real interest rate (Neutral RR approx 3-4%)
p.ss_RR_BAR = 3.5;

% Change in the real ER (Balassa-Samuelson real appreciation)
p.ss_DLA_Z_BAR = -1.0; 

% Foreign inflation (Trading partners avg)
p.ss_DLA_CPI_RW = 2.5;

% Level of foreign real interest rate (e.g., US Fed Funds real neutral)
p.ss_RR_RW_BAR = 1.0;
%% === Structural Parameters (Calibrated for UZB Transmission) === 
%-------- 1. Aggregate demand (IS curve) 
p.b1 = 0.7; % ЯИМ ўсишининг 70% қисми ўтмишдаги ҳолатга боғлиқ. Пул ўтказмалари ва ташқи шокларга иқтисодиётнинг таъсирчанлиги юқори. Ривожланган давлатларда бу одатда 0.8-0.9 бўлади.

p.b2 = 0.2; % Марказий банк ставкани оширганда, бу иқтисодий фаолликни қанчалик сусайтиради? 0.2 — бу жуда паст кўрсаткич. Ўзбекистонда монетар трансмиссия ҳали тўлиқ шаклланмаган

p.b3 = 0.3; % Ташқи дунёнинг иқтисодий ўсишга таъсири вазни.

p.b4 = 0.6; % Монетар шароитлар индексида фоиз ставкасининг улуши 60%, алмашув курсининг улуши эса 40%. Бу фоиз ставкасининг аҳамияти курсга қараганда юқорироқлигини англатади.

%-------- 2. Inflation (Phillips curve)
p.a1 = 0.6; % Инфляциянинг 60% қисми "кечаги" инфляцияга боғлиқ. Қолган 40% эса келажакдаги кутилмаларга таянади. Кўрсаткичнинг 0.7 дан пастлиги Ўзбекистонда инфляцион кутилмаларнинг ўзгарувчанлиги юқорилигини англатади.

p.a2 = 0.2; % Харажатлар ошганда инфляция қанчалик тез ўсади? (маржинал харажатлар яъни бир бирлик маҳсулот ишлаб чиқариш учун, масалан иш ҳақи ёки хомашё ошиши ҳисобига)

p.a3 = 0.65; % (Ички vs Импорт харажатлари): Инфляциянинг 65% қисми ички талаб ва 35% қисми импорт нархлари (валюта курси) таъсирида шаклланади.

% p.a2 = 0.30;   % сильнее влияние издержек
% p.a3 = 0.75;   % больше роль внутреннего спроса

%-------- 3. Monetary policy reaction (Taylor rule)
p.g1 = 0.8; % CBU tends to be cautious/persistent with rate moves
p.g2 = 1.5; % Taylor Principle: must be > 1.0 for stability (Aggressive on inflation)
p.g3 = 0.5; % Weight on output gap

%-------- 4. UIP and Risk
p.e1 = 0.7; % Higher backward-looking component for UZS/USD dynamics

%-------- 5. Convergence speeds (rho)
p.rho_D4L_CPI_TAR = 0.9; % Target adjustment is slow and gradual
p.rho_DLA_Z_BAR   = 0.8;
p.rho_DLA_GDP_BAR = 0.8;
p.rho_RR_BAR      = 0.9;
p.rho_RR_RW_BAR   = 0.8;
p.rho_L_GDP_RW_GAP = 0.8;
p.rho_RS_RW      = 0.8;
p.rho_DLA_CPI_RW = 0.8;
p.rho_RR_RW_BAR  = 0.8;

%% === Solving the model === 
% Убедитесь, что название файла совпадает с Uzbekistan.model
m = Model.fromFile('Uzbekistan.model', 'Linear', true, 'Assign', p);
m = solve(m);
m = sstate(m);

%% === Information which can be extracted === 
% ОЧЕНЬ ВАЖНО: Эти строки должны быть ВНУТРИ функции до слова 'end'
mss = get(m, 'sstate');

%% === Check steady state === 
[flag, discrep, eqtn] = chksstate(m, 'error', false);
if ~flag
    % Если есть ошибка, мы хотим ее увидеть, но не прерывать функцию жестко
    warning('Steady state fails in: %s', eqtn{1});
end
% Конец функции