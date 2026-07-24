/* =============================================================
   Marmaris — Turkish Kitchen, Al Wakrah
   Independent website concept by Kevro Apps.

   No framework, no build step. Behaviours:
     1. Mobile navigation panel (focus-trapped, Esc to close)
     2. Sample-menu category filter
     3. Scroll spy for the desktop nav
     4. EN / AR language toggle (RTL, localStorage-persisted)
     5. Order-online overlay (client-side concept cart, no backend)
     6. Floating order pill on scroll
   ============================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = reduceMotion ? 0 : 280;

  /* -----------------------------------------------------------
     0. Translations
     Turkish dish names stay Turkish; descriptions translate.
     ----------------------------------------------------------- */
  var I18N = {
    en: {
      'a11y.skip': 'Skip to main content',
      'a11y.newtab': '(opens in a new tab)',
      'a11y.openmenu': 'Open menu',
      'a11y.closemenu': 'Close menu',
      'brand.name': 'Marmaris',
      'brand.sub': 'Turkish Kitchen · Al Wakrah',
      'nav.menu': 'Sample menu',
      'nav.table': 'The table',
      'nav.kitchen': 'The kitchen',
      'nav.visit': 'Visit',
      'nav.contact': 'Contact',
      'nav.title': 'Menu',
      'cta.directions': 'Directions',
      'cta.directionsmaps': 'Directions on Google Maps',
      'cta.order': 'Order Online',
      'cta.call': 'Call',
      'cta.callnum': 'Call 4464 6677',
      'cta.whatsapp': 'WhatsApp',
      'cta.wanote': 'WhatsApp number is illustrative — confirm with the restaurant.',
      'hero.eyebrow': 'Al Wakrah · Qatar',
      'hero.title': 'Turkish charcoal, <em>around the clock</em>, in Al Wakrah.',
      'hero.lede': 'Adana off the skewer, pide straight from the oven, mezze in blue ceramic, and a full Turkish breakfast at any hour you happen to want one. The grill does not keep office hours — the kitchen is open 24 hours.',
      'fact.1a': 'Turkish', 'fact.1b': 'Kitchen & grill',
      'fact.2a': '24 hours', 'fact.2b': 'Every day',
      'fact.3a': '4.0', 'fact.3b': 'Google rating',
      'strip.note': 'Listed on Google Maps as',
      'strip.note2': 'Turkish Marmaria Restaurant',
      'menu.title': 'What a Turkish kitchen puts on the table',
      'menu.lede': 'A small taste of five Turkish traditions, from a slow breakfast spread to a plate straight off the coals.',
      'menu.noticelabel': 'A note on this menu',
      'menu.noticebody': 'These ten dishes are an <strong>illustrative</strong> selection, chosen to show the shape of a Turkish kitchen. They are not the restaurant’s confirmed menu, and no prices are shown here. Real dishes and real pricing would replace every line before anything goes live.',
      'menu.empty': 'No dishes in this category.',
      'menu.ordercta': 'Order these online',
      'menu.foot': 'Prices are deliberately omitted from this list. Illustrative concept pricing appears only inside the order panel. Ask the kitchen, or <a href="tel:+97444646677">call 4464 6677</a>.',
      'filter.label': 'Filter dishes',
      'filter.all': 'All', 'filter.breakfast': 'Breakfast', 'filter.grills': 'Grills',
      'filter.pide': 'Pide', 'filter.mezze': 'Mezze', 'filter.desserts': 'Desserts',
      'gallery.title': 'Turkish eating is a table sport',
      'gallery.lede': 'Nothing here arrives alone. Bread, tea and a dozen small plates turn up whether you asked or not.',
      'gallery.cap1': 'Breakfast, laid across the whole table',
      'gallery.cap2': 'Charcoal, kept honest',
      'gallery.cap3': 'Mezze in blue ceramic',
      'gallery.cap4': 'Pide, straight from the oven',
      'gallery.cap5': 'The mixed grill, for the middle of the table',
      'gallery.cap6': 'Baklava, cut but not yet claimed',
      'gallery.credit': 'Photography from <a href="https://unsplash.com/" target="_blank" rel="noopener noreferrer">Unsplash</a> under the Unsplash License, used here to illustrate the concept. These are stock images, not photographs of the restaurant.',
      'kitchen.eyebrow': 'At the Turkish table',
      'kitchen.title': 'How a Turkish kitchen sets the table',
      'kitchen.lede': 'Four things that shape the way a meal is eaten here, whether you sit down at nine in the morning or three in the morning.',
      'kitchen.1t': 'Charcoal does the cooking',
      'kitchen.1p': 'Skewers are worked over coals, close enough to hear. Lamb, chicken and chops come off the fire with charred edges and nothing added that would get in the way.',
      'kitchen.2t': 'Breakfast at any hour',
      'kitchen.2p': 'Eggs in the pan, cheese and olives, honey with clotted cream, tea in tulip glasses. A Turkish breakfast is not tied to the morning — the kitchen is open 24 hours.',
      'kitchen.3t': 'Mezze is meant to be shared',
      'kitchen.3p': 'Small plates land in the middle and stay there. Hummus, yoghurt with garlic and mint, chopped salad, warm bread — everyone reaches across, nobody eats alone.',
      'kitchen.4t': 'The restaurant is one call away',
      'kitchen.4p': 'For a big table, a late plate or a quick question, call 4464 6677 directly. Directions are a single tap, at any hour of the night.',
      'visit.title': 'Al Wakrah, whenever you get hungry',
      'visit.lede': 'Open through the night and back around again. Call ahead for a large table, or just come.',
      'visit.area': 'Area', 'visit.areav': 'Al Wakrah, Qatar',
      'visit.hours': 'Hours', 'visit.hoursv': 'Open 24 hours, every day',
      'visit.phone': 'Phone',
      'visit.whatsapp': 'WhatsApp', 'visit.wahint': '(illustrative)',
      'visit.cuisine': 'Cuisine', 'visit.cuisinev': 'Turkish',
      'visit.clockhrs': 'hours',
      'visit.days': 'Monday – Sunday', 'visit.open24': 'Open 24 hours',
      'visit.anyhour': 'Any hour you like',
      'visit.lategrill': 'Late grill', 'visit.stillon': 'Still on',
      'visit.disclaimer': 'Exact street address is intentionally not printed here. The Directions button opens a Google Maps search for the listing rather than a guessed pin. The WhatsApp number is illustrative for this concept — confirm it with the restaurant.',
      'visit.source': 'Hours, phone number and rating as shown on the Google Maps listing, checked 23 July 2026.',
      'contact.title': 'Call directly, whatever the hour',
      'contact.lede': 'For today’s menu, a large table, or a quick question, call the restaurant directly using the public number below.',
      'contact.note': 'The number above is the public phone shown on the Google Maps listing, and the Directions button opens a search for that listing. The WhatsApp number is illustrative. Nothing on this page takes a real order or a payment.',
      'footer.name': 'Marmaris — Turkish Kitchen',
      'footer.meta': 'Al Wakrah, Qatar · Open 24 hours',
      'footer.disclaimer': 'Independent website concept by Kevro Apps. Not the restaurant’s official website.',
      'footer.fine': 'Unsolicited design concept, not commissioned work. Business details shown (Turkish cuisine, Al Wakrah, open 24 hours, 4464 6677, 4.0 rating) were read from the public Google Maps listing on 23 July 2026 and may change. Dish names, descriptions, all pricing and all photography are illustrative and are not the restaurant’s own. Online ordering and the WhatsApp number are a non-functional concept — no order is taken and no payment is processed. No affiliation or endorsement is claimed.',
      'cart.eyebrow': 'Order online',
      'cart.title': 'Your order',
      'cart.concept': 'Concept pricing — illustrative. These figures are placeholders to demonstrate the layout, not the restaurant’s real prices.',
      'cart.total': 'Total',
      'cart.disclaimer': 'This is a website concept. No real order is placed and no payment is processed.',
      'cart.checkout': 'Place concept order',
      'cart.close': 'Close order panel',
      'cart.confirmed': 'Thank you — this is a concept, so no order was placed and nothing was charged.',
      'cart.waorder': 'Send order over WhatsApp instead',
      'dish.1.en': 'Spread breakfast', 'dish.2.en': 'Eggs, tomato, pepper',
      'dish.3.en': 'Hand-minced lamb', 'dish.4.en': 'Döner over bread',
      'dish.5.en': 'Minced beef pide', 'dish.6.en': 'Thin flatbread',
      'dish.7.en': 'Chickpea & tahini', 'dish.8.en': 'Chopped salad relish',
      'dish.9.en': 'Filo & pistachio', 'dish.10.en': 'Hot cheese pastry',
      'dish.1.desc': 'Small plates across the whole table — white cheese, olives, tomato, cucumber, honey with clotted cream, jams, and bread that keeps arriving.',
      'dish.2.desc': 'Eggs cooked slowly into tomato and green pepper with olive oil, served in the pan while it is still moving.',
      'dish.3.desc': 'Lamb minced by hand, pressed onto a flat skewer and worked over charcoal until the edges char and the centre stays soft.',
      'dish.4.desc': 'Sliced döner laid over cubed bread, tomato sauce poured across, yoghurt on the side.',
      'dish.5.desc': 'A long boat of dough with seasoned minced beef, sealed at both ends and baked until the edges blister.',
      'dish.6.desc': 'Paper-thin round bread with a fine layer of minced meat. Parsley, a squeeze of lemon, then rolled.',
      'dish.7.desc': 'Chickpeas and tahini worked smooth, a well of olive oil in the middle.',
      'dish.8.desc': 'Tomato, pepper, onion and parsley chopped fine enough to scoop with bread.',
      'dish.9.desc': 'Layer on layer of filo with pistachio or walnut, cut into diamonds and rested in syrup.',
      'dish.10.desc': 'Shredded pastry over cheese, baked until the top is copper and the middle pulls. Served hot or not at all.'
    },
    ar: {
      'a11y.skip': 'تخطى إلى المحتوى الرئيسي',
      'a11y.newtab': '(يُفتح في تبويب جديد)',
      'a11y.openmenu': 'فتح القائمة',
      'a11y.closemenu': 'إغلاق القائمة',
      'brand.name': 'مرمرية',
      'brand.sub': 'مطبخ تركي · الوكرة',
      'nav.menu': 'قائمة الطعام',
      'nav.table': 'المائدة',
      'nav.kitchen': 'المطبخ',
      'nav.visit': 'الزيارة',
      'nav.contact': 'اتصل بنا',
      'nav.title': 'القائمة',
      'cta.directions': 'الاتجاهات',
      'cta.directionsmaps': 'الاتجاهات على خرائط جوجل',
      'cta.order': 'اطلب الآن',
      'cta.call': 'اتصل',
      'cta.callnum': 'اتصل 4464 6677',
      'cta.whatsapp': 'واتساب',
      'cta.wanote': 'رقم واتساب تجريبي — يُرجى التأكيد مع المطعم.',
      'hero.eyebrow': 'الوكرة · قطر',
      'hero.title': 'فحم تركي، <em>على مدار الساعة</em>، في الوكرة.',
      'hero.lede': 'أدنة من السيخ، وبيدة توّاً من الفرن، ومقبّلات في خزف أزرق، وفطور تركي كامل في أي ساعة تشتهيه. المشواة لا تعرف أوقات الدوام — المطبخ مفتوح 24 ساعة.',
      'fact.1a': 'تركي', 'fact.1b': 'مطبخ ومشاوي',
      'fact.2a': '24 ساعة', 'fact.2b': 'كل يوم',
      'fact.3a': '4.0', 'fact.3b': 'تقييم جوجل',
      'strip.note': 'مدرج على خرائط جوجل باسم',
      'strip.note2': 'مطعم مرمرية التركي',
      'menu.title': 'ما يضعه المطبخ التركي على المائدة',
      'menu.lede': 'لمحة صغيرة من خمس تقاليد تركية، من فطور متأنٍّ إلى طبق توّاً من الجمر.',
      'menu.noticelabel': 'ملاحظة حول هذه القائمة',
      'menu.noticebody': 'هذه الأطباق العشرة اختيار <strong>توضيحي</strong>، اختير ليبين ملامح المطبخ التركي. وهي ليست قائمة المطعم المعتمدة، ولا تُعرض أي أسعار هنا. الأطباق والأسعار الحقيقية ستحل محل كل سطر قبل الإطلاق.',
      'menu.empty': 'لا توجد أطباق في هذه الفئة.',
      'menu.ordercta': 'اطلب هذه الأطباق الآن',
      'menu.foot': 'الأسعار محذوفة عمداً من هذه القائمة. تظهر أسعار تجريبية توضيحية داخل لوحة الطلب فقط. اسأل المطبخ، أو <a href="tel:+97444646677">اتصل 4464 6677</a>.',
      'filter.label': 'تصفية الأطباق',
      'filter.all': 'الكل', 'filter.breakfast': 'الفطور', 'filter.grills': 'المشاوي',
      'filter.pide': 'البيدة', 'filter.mezze': 'المقبّلات', 'filter.desserts': 'الحلويات',
      'gallery.title': 'الأكل التركي رياضة جماعية على المائدة',
      'gallery.lede': 'لا شيء هنا يأتي وحيداً. الخبز والشاي وعشرات الأطباق الصغيرة تصل سواء طلبتها أم لا.',
      'gallery.cap1': 'الفطور، ممتدّاً على المائدة كلها',
      'gallery.cap2': 'الفحم، على أصوله',
      'gallery.cap3': 'مقبّلات في خزف أزرق',
      'gallery.cap4': 'بيدة، توّاً من الفرن',
      'gallery.cap5': 'المشوي المشكّل، لوسط المائدة',
      'gallery.cap6': 'بقلاوة، مقطّعة ولمّا تُؤخذ بعد',
      'gallery.credit': 'الصور من <a href="https://unsplash.com/" target="_blank" rel="noopener noreferrer">Unsplash</a> بموجب رخصة Unsplash، مستخدمة هنا لتوضيح الفكرة. هذه صور أرشيفية، وليست صوراً للمطعم.',
      'kitchen.eyebrow': 'على المائدة التركية',
      'kitchen.title': 'كيف يُعِدّ المطبخ التركي المائدة',
      'kitchen.lede': 'أربعة أمور تصوغ طريقة تناول الطعام هنا، سواء جلست التاسعة صباحاً أو الثالثة فجراً.',
      'kitchen.1t': 'الفحم هو من يطبخ',
      'kitchen.1p': 'الأسياخ تُشوى على الجمر، قريبة بما يكفي لتسمعها. الضأن والدجاج والريش تخرج من النار بحواف متفحّمة دون إضافات تعترض الطريق.',
      'kitchen.2t': 'فطور في أي ساعة',
      'kitchen.2p': 'بيض في المقلاة، جبن وزيتون، عسل مع القشطة، وشاي في أكواب التيوليب. الفطور التركي لا يرتبط بالصباح — المطبخ مفتوح 24 ساعة.',
      'kitchen.3t': 'المقبّلات للمشاركة',
      'kitchen.3p': 'الأطباق الصغيرة تحط في الوسط وتبقى هناك. حمّص، لبن بالثوم والنعناع، سلطة مفرومة، وخبز دافئ — الجميع يمد يده، ولا أحد يأكل وحده.',
      'kitchen.4t': 'المطعم على بعد مكالمة',
      'kitchen.4p': 'لطاولة كبيرة، أو طبق متأخر، أو سؤال سريع، اتصل بـ 4464 6677 مباشرة. الاتجاهات بلمسة واحدة، في أي ساعة من الليل.',
      'visit.title': 'الوكرة، متى ما جعت',
      'visit.lede': 'مفتوح طوال الليل ويعود من جديد. اتصل مسبقاً لطاولة كبيرة، أو تعال فحسب.',
      'visit.area': 'المنطقة', 'visit.areav': 'الوكرة، قطر',
      'visit.hours': 'ساعات العمل', 'visit.hoursv': 'مفتوح 24 ساعة، كل يوم',
      'visit.phone': 'الهاتف',
      'visit.whatsapp': 'واتساب', 'visit.wahint': '(تجريبي)',
      'visit.cuisine': 'المطبخ', 'visit.cuisinev': 'تركي',
      'visit.clockhrs': 'ساعة',
      'visit.days': 'الإثنين – الأحد', 'visit.open24': 'مفتوح 24 ساعة',
      'visit.anyhour': 'في أي ساعة تشاء',
      'visit.lategrill': 'مشاوي الليل', 'visit.stillon': 'ما زالت مشتعلة',
      'visit.disclaimer': 'العنوان الدقيق غير مطبوع هنا عمداً. زر الاتجاهات يفتح بحثاً في خرائط جوجل عن المطعم بدلاً من دبّوس مخمّن. رقم واتساب تجريبي لهذا النموذج — يُرجى التأكيد مع المطعم.',
      'visit.source': 'ساعات العمل ورقم الهاتف والتقييم كما هي في خرائط جوجل، تم التحقق في 23 يوليو 2026.',
      'contact.title': 'اتصل مباشرة، في أي ساعة',
      'contact.lede': 'لقائمة اليوم، أو لطاولة كبيرة، أو لسؤال سريع، اتصل بالمطعم مباشرة على الرقم العام أدناه.',
      'contact.note': 'الرقم أعلاه هو الهاتف العام المعروض على خرائط جوجل، وزر الاتجاهات يفتح بحثاً عن ذلك المطعم. رقم واتساب تجريبي. لا شيء في هذه الصفحة يأخذ طلباً حقيقياً أو دفعاً.',
      'footer.name': 'مرمرية — مطبخ تركي',
      'footer.meta': 'الوكرة، قطر · مفتوح 24 ساعة',
      'footer.disclaimer': 'نموذج موقع مستقل من Kevro Apps. ليس الموقع الرسمي للمطعم.',
      'footer.fine': 'نموذج تصميمي غير مطلوب، وليس عملاً بتكليف. البيانات المعروضة (مطبخ تركي، الوكرة، مفتوح 24 ساعة، 4464 6677، تقييم 4.0) قُرئت من قائمة خرائط جوجل العامة في 23 يوليو 2026 وقد تتغير. أسماء الأطباق والأوصاف وجميع الأسعار والصور توضيحية وليست خاصة بالمطعم. الطلب عبر الإنترنت ورقم واتساب مجرد نموذج غير فعّال — لا يُؤخذ أي طلب ولا يُعالج أي دفع. لا يُدّعى أي ارتباط أو تأييد.',
      'cart.eyebrow': 'الطلب عبر الإنترنت',
      'cart.title': 'طلبك',
      'cart.concept': 'أسعار تجريبية — للتوضيح فقط. هذه الأرقام نائبة لعرض التصميم، وليست أسعار المطعم الحقيقية.',
      'cart.total': 'المجموع',
      'cart.disclaimer': 'هذا نموذج لموقع إلكتروني. لا يتم تقديم أي طلب حقيقي ولا تتم معالجة أي دفع.',
      'cart.checkout': 'إتمام الطلب التجريبي',
      'cart.close': 'إغلاق لوحة الطلب',
      'cart.confirmed': 'شكراً لك — هذا نموذج، لذا لم يُقدّم أي طلب ولم يُحتسب أي مبلغ.',
      'cart.waorder': 'أرسل الطلب عبر واتساب بدلاً من ذلك',
      'dish.1.en': 'فطور مفتوح', 'dish.2.en': 'بيض وطماطم وفلفل',
      'dish.3.en': 'ضأن مفروم يدوياً', 'dish.4.en': 'دونر على الخبز',
      'dish.5.en': 'بيدة بلحم البقر', 'dish.6.en': 'خبز رقيق',
      'dish.7.en': 'حمّص وطحينة', 'dish.8.en': 'سلطة مفرومة',
      'dish.9.en': 'فيلو وفستق', 'dish.10.en': 'معجّنات الجبن الساخنة',
      'dish.1.desc': 'أطباق صغيرة تملأ المائدة — جبن أبيض، زيتون، طماطم، خيار، عسل مع القشطة، أنواع المربى، وخبز لا يتوقف عن الوصول.',
      'dish.2.desc': 'بيض يُطهى على مهل مع الطماطم والفلفل الأخضر وزيت الزيتون، ويُقدّم في المقلاة وهو ما زال يغلي.',
      'dish.3.desc': 'لحم ضأن مفروم يدوياً، يُضغط على سيخ مسطّح ويُشوى على الفحم حتى تتفحّم الأطراف ويبقى القلب طريّاً.',
      'dish.4.desc': 'شرائح دونر فوق مكعبات الخبز، تُسكب عليها صلصة الطماطم، ويُقدّم اللبن إلى جانبها.',
      'dish.5.desc': 'قارب طويل من العجين محشوّ بلحم البقر المفروم المتبّل، يُغلق من الطرفين ويُخبز حتى تتورّد الحواف.',
      'dish.6.desc': 'خبز رقيق مستدير بطبقة خفيفة من اللحم المفروم. بقدونس، وعصرة ليمون، ثم يُلفّ.',
      'dish.7.desc': 'حمّص وطحينة يُخفقان حتى النعومة، مع بئر من زيت الزيتون في الوسط.',
      'dish.8.desc': 'طماطم وفلفل وبصل وبقدونس مفرومة ناعمة بما يكفي لتُغرف بالخبز.',
      'dish.9.desc': 'طبقات من عجين الفيلو مع الفستق أو الجوز، تُقطّع معيّنات وتُنقع في القطر.',
      'dish.10.desc': 'عجينة مبروشة فوق الجبن، تُخبز حتى يصبح وجهها نحاسيّاً ويتمطّط قلبها. تُقدّم ساخنة أو لا تُقدّم.'
    }
  };

  var CAT_LABEL = {
    en: { breakfast: 'breakfast', grills: 'grills', pide: 'pide', mezze: 'mezze', desserts: 'desserts' },
    ar: { breakfast: 'الفطور', grills: 'المشاوي', pide: 'البيدة', mezze: 'المقبّلات', desserts: 'الحلويات' }
  };

  var lang = document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';
  function t(key) { return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] != null ? I18N.en[key] : key); }

  /* -----------------------------------------------------------
     1. Mobile navigation
     ----------------------------------------------------------- */
  var toggle = document.getElementById('nav-toggle');
  var closeBtn = document.getElementById('nav-close');
  var overlay = document.getElementById('mobile-nav');
  var panel = overlay && overlay.querySelector('.mobile-nav__panel');
  var lastFocused = null;

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function focusableIn(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll(FOCUSABLE),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
  }

  function openNav() {
    if (!overlay) return;
    lastFocused = document.activeElement;
    overlay.hidden = false;
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.visually-hidden').textContent = t('a11y.closemenu');
    document.documentElement.style.overflow = 'hidden';

    var first = focusableIn(panel)[0];
    if (first) first.focus();
    document.addEventListener('keydown', onNavKeydown, true);
  }

  function closeNav(restoreFocus) {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.visually-hidden').textContent = t('a11y.openmenu');
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onNavKeydown, true);

    var finish = function () { overlay.hidden = true; };
    if (reduceMotion) finish();
    else window.setTimeout(finish, DUR);

    if (restoreFocus !== false && lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function trapTab(e, root) {
    if (e.key !== 'Tab') return;
    var items = focusableIn(root);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onNavKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeNav(true); return; }
    trapTab(e, panel);
  }

  if (toggle && overlay && panel) {
    toggle.addEventListener('click', function () {
      if (overlay.hidden) openNav(); else closeNav(true);
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeNav(true); });
    overlay.addEventListener('click', function (e) {
      if (!panel.contains(e.target)) closeNav(true);
    });
    overlay.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (link) closeNav(false);
    });
    var desktop = window.matchMedia('(min-width: 860px)');
    var onBreak = function (ev) { if (ev.matches) closeNav(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreak);
    else if (desktop.addListener) desktop.addListener(onBreak);
  }

  /* -----------------------------------------------------------
     2. Sample-menu filter
     ----------------------------------------------------------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
  var dishes = Array.prototype.slice.call(document.querySelectorAll('.dish[data-cat]'));
  var status = document.getElementById('filter-status');
  var empty = document.getElementById('dish-empty');
  var currentFilter = 'all';

  function statusText(key, shown) {
    if (lang === 'ar') {
      return key === 'all'
        ? 'يتم عرض جميع الأطباق (' + shown + ').'
        : 'يتم عرض ' + shown + ' من أطباق ' + CAT_LABEL.ar[key] + '.';
    }
    return key === 'all'
      ? 'Showing all ' + shown + ' sample dishes.'
      : 'Showing ' + shown + ' ' + CAT_LABEL.en[key] + ' ' + (shown === 1 ? 'dish' : 'dishes') + '.';
  }

  function applyFilter(key) {
    currentFilter = key;
    var shown = 0;
    dishes.forEach(function (dish) {
      var match = key === 'all' || dish.getAttribute('data-cat') === key;
      dish.hidden = !match;
      if (match) shown++;
    });
    chips.forEach(function (chip) {
      var on = chip.getAttribute('data-filter') === key;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (empty) empty.hidden = shown !== 0;
    if (status) status.textContent = statusText(key, shown);
  }

  if (chips.length && dishes.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { applyFilter(chip.getAttribute('data-filter')); });
    });
    applyFilter('all');
  }

  /* -----------------------------------------------------------
     3. Scroll spy (desktop nav)
     ----------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__list a[href^="#"]'));
  var spySections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (spySections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spySections.forEach(function (s) { spy.observe(s); });
  }

  /* -----------------------------------------------------------
     4. Order / cart overlay (client-side concept only)
     ----------------------------------------------------------- */
  var DISHES = [
    { id: 1, name: 'Serpme Kahvaltı', price: 45 },
    { id: 2, name: 'Menemen', price: 28 },
    { id: 3, name: 'Adana Kebap', price: 42 },
    { id: 4, name: 'İskender', price: 46 },
    { id: 5, name: 'Kıymalı Pide', price: 34 },
    { id: 6, name: 'Lahmacun', price: 25 },
    { id: 7, name: 'Humus', price: 26 },
    { id: 8, name: 'Ezme', price: 25 },
    { id: 9, name: 'Baklava', price: 32 },
    { id: 10, name: 'Künefe', price: 38 }
  ];
  var qty = {};
  DISHES.forEach(function (d) { qty[d.id] = 0; });

  var cart = document.getElementById('cart');
  var cartPanel = cart && cart.querySelector('.cart__panel');
  var cartItemsEl = document.getElementById('cart-items');
  var cartTotalEl = document.getElementById('cart-total');
  var cartConfirm = document.getElementById('cart-confirm');
  var checkoutBtn = document.getElementById('cart-checkout');
  var pill = document.getElementById('order-pill');
  var pillCount = document.getElementById('order-pill-count');
  var orderOpeners = Array.prototype.slice.call(document.querySelectorAll('[data-order-open]'));
  var cartClosers = cart ? Array.prototype.slice.call(cart.querySelectorAll('[data-cart-close]')) : [];
  var cartLastFocused = null;

  function money(n) { return lang === 'ar' ? (n + ' ر.ق') : ('QR ' + n); }

  function itemCount() {
    var c = 0;
    DISHES.forEach(function (d) { c += qty[d.id]; });
    return c;
  }

  function updateTotals() {
    var total = 0, count = itemCount();
    DISHES.forEach(function (d) { total += qty[d.id] * d.price; });
    if (cartTotalEl) cartTotalEl.textContent = money(total);
    if (pillCount) {
      pillCount.textContent = String(count);
      pillCount.hidden = count === 0;
    }
  }

  function renderCart() {
    if (!cartItemsEl) return;
    cartItemsEl.innerHTML = '';
    DISHES.forEach(function (d) {
      var li = document.createElement('li');
      li.className = 'cart-item' + (qty[d.id] > 0 ? ' is-active' : '');

      var info = document.createElement('div');
      info.className = 'cart-item__info';
      var nm = document.createElement('span');
      nm.className = 'cart-item__name';
      nm.textContent = d.name;
      var pr = document.createElement('span');
      pr.className = 'cart-item__price';
      pr.textContent = money(d.price);
      info.appendChild(nm); info.appendChild(pr);

      var q = document.createElement('div');
      q.className = 'cart-item__qty';

      var minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'qty-btn';
      minus.textContent = '−';
      minus.disabled = qty[d.id] === 0;
      minus.setAttribute('aria-label', (lang === 'ar' ? 'أنقص ' : 'Remove one ') + d.name);
      minus.addEventListener('click', function () { setQty(d.id, qty[d.id] - 1); });

      var count = document.createElement('span');
      count.className = 'cart-item__count';
      count.textContent = String(qty[d.id]);

      var plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'qty-btn';
      plus.textContent = '+';
      plus.setAttribute('aria-label', (lang === 'ar' ? 'أضف ' : 'Add one ') + d.name);
      plus.addEventListener('click', function () { setQty(d.id, qty[d.id] + 1); });

      q.appendChild(minus); q.appendChild(count); q.appendChild(plus);
      li.appendChild(info); li.appendChild(q);
      cartItemsEl.appendChild(li);
    });
    updateTotals();
  }

  function setQty(id, val) {
    qty[id] = Math.max(0, val);
    if (cartConfirm) cartConfirm.hidden = true;
    renderCart();
  }

  function openCart() {
    if (!cart) return;
    cartLastFocused = document.activeElement;
    cart.hidden = false;
    void cart.offsetWidth;
    cart.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    var first = focusableIn(cartPanel)[0];
    if (first) first.focus();
    document.addEventListener('keydown', onCartKeydown, true);
  }

  function closeCart() {
    if (!cart || cart.hidden) return;
    cart.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onCartKeydown, true);
    var finish = function () { cart.hidden = true; };
    if (reduceMotion) finish();
    else window.setTimeout(finish, DUR);
    if (cartLastFocused && cartLastFocused.focus) cartLastFocused.focus();
  }

  function onCartKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeCart(); return; }
    trapTab(e, cartPanel);
  }

  if (cart && cartPanel) {
    renderCart();
    orderOpeners.forEach(function (btn) { btn.addEventListener('click', openCart); });
    cartClosers.forEach(function (btn) { btn.addEventListener('click', closeCart); });
    if (checkoutBtn && cartConfirm) {
      checkoutBtn.addEventListener('click', function () {
        cartConfirm.textContent = t('cart.confirmed');
        cartConfirm.hidden = false;
      });
    }
  }

  /* -----------------------------------------------------------
     5. Floating order pill (appears after the hero scrolls away)
     ----------------------------------------------------------- */
  if (pill) {
    var showPillAt = 620;
    var onScroll = function () {
      var show = window.scrollY > showPillAt;
      pill.classList.toggle('is-shown', show);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -----------------------------------------------------------
     6. Language toggle (EN / AR)
     ----------------------------------------------------------- */
  var langToggle = document.getElementById('lang-toggle');

  function applyLang(next) {
    lang = next === 'ar' ? 'ar' : 'en';
    var de = document.documentElement;
    de.setAttribute('lang', lang);
    de.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    de.setAttribute('data-lang', lang);

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v != null) el.textContent = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-html]'), function (el) {
      var v = t(el.getAttribute('data-i18n-html'));
      if (v != null) el.innerHTML = v;
    });

    if (langToggle) {
      langToggle.setAttribute('aria-label', lang === 'ar'
        ? 'Switch to English'
        : 'التبديل إلى العربية');
      Array.prototype.forEach.call(langToggle.querySelectorAll('[data-lang-opt]'), function (opt) {
        opt.classList.toggle('is-active', opt.getAttribute('data-lang-opt') === lang);
      });
    }

    // Re-render the language-sensitive dynamic pieces.
    applyFilter(currentFilter);
    if (cartConfirm) cartConfirm.hidden = true;
    renderCart();

    try { localStorage.setItem('marmaris-lang', lang); } catch (e) { /* private mode */ }
  }

  if (langToggle) {
    langToggle.addEventListener('click', function () {
      applyLang(lang === 'ar' ? 'en' : 'ar');
    });
  }

  // Apply the stored/initial language once on boot so text, dir and dynamic
  // pieces are all consistent (the inline head script only set dir/lang early).
  applyLang(lang);

  /* -----------------------------------------------------------
     7. Mark the document as enhanced (used by the test harness)
     ----------------------------------------------------------- */
  document.documentElement.setAttribute('data-js', 'ready');
}());
