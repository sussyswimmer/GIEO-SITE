# Site Map and Copy (EN + VI)

All long-form copy below is **verbatim from GIEO's Org Info doc or GIEO's own Facebook posts** (the 20/10 post and the season recap post). Lines marked `DRAFT` are short connective lines written for the site; they must be shown to GIEO for approval and are the only copy you may edit freely. Store everything in `src/content/{en,vi}.json`, never hard-code strings in components.

---

## Site map

```
/                 Home: one continuous scroll (sections H0 to H8 below)
/collections      Product collections (one block per collection; starts with the H'mong brocade collection)
/about            Story, three pillars in depth, departments, team (TODO(team)), partner
/get-involved     Shop, mentor, partner, volunteer, donate (TODO(donate))
/contact          Email, Instagram, Facebook, simple form (mailto fallback)
```
Language switch: `/` and `/en` (or `next-intl` locale prefix). Every page exists in both languages.

---

## Home: section by section

### H0. Hero (3D Animation 1: "Gieo", the seed)
- Eyebrow: `Girls' Initiative for Education and Opportunities`
- Headline (display, huge): **GIEO**
- Sub (DRAFT):
  - VI: "Gieo những hạt mầm hy vọng cho các em gái vùng cao."
  - EN: "Sowing seeds of hope for girls in Vietnam's mountain communities."
- Scroll cue: a thin sprout line, no "scroll down" text bar.

### H1. What "gieo" means
- Small dictionary card (DRAFT format, content from doc):
  - **gieo** (v.) /zɛw/ : to sow
  - EN: "In Vietnamese, the word "gieo" means to sow, symbolizing the planting of seeds of hope, opportunity, and lasting change for girls growing up in rural and mountainous communities across Vietnam."
  - VI: "Trong tiếng Việt, từ "gieo" mang ý nghĩa gieo mầm, tượng trưng cho việc gieo những hạt giống của hy vọng, cơ hội và sự thay đổi bền vững dành cho các em gái lớn lên tại các vùng nông thôn và miền núi trên khắp Việt Nam."
- Under it, one line: student-led, Hanoi, IB Global Youth Action Fund.
  - EN: "Girls' Initiative for Education and Opportunities (GIEO) is a student-led social initiative founded and operated by a group of high school students in Hanoi."
  - VI: "Girls' Initiative for Education and Opportunities (GIEO) là một sáng kiến xã hội do học sinh trung học phổ thông tại Hà Nội sáng lập và vận hành."

### H2. The craft (3D Animation 2: thread to brocade to product)
Beat 1:
- EN: "Our initiative combines cultural preservation with community development by creating modern lifestyle products that appeal to younger generations while celebrating the traditional brocade weaving of the H'mong people."
- VI: "Sáng kiến của GIEO kết hợp giữa bảo tồn văn hóa và phát triển cộng đồng thông qua việc tạo ra những sản phẩm mang phong cách hiện đại, phù hợp với thế hệ trẻ nhưng vẫn tôn vinh nghề dệt thổ cẩm truyền thống của người H'Mông."

Beat 2 (pull quote, from their 20/10 post):
- EN: "Every single thread, every careful stitch, and every piece of woven fabric tells the quiet, enduring story of a Vietnamese woman."
- VI: "Từng sợi chỉ đan, từng mũi khâu dệt, từng mảnh vải thêu đều là một câu chuyện bền bỉ về người phụ nữ Việt Nam."

Beat 3 (products appear: tote, mug, coaster):
- EN: "Rather than simply selling handicrafts, GIEO develops contemporary products inspired by traditional H'mong brocade, making ethnic craftsmanship more accessible and relevant to today's young consumers. Every purchase helps sustain traditional weaving while directly supporting the women artisans who preserve this cultural heritage."
- VI: "Thay vì chỉ đơn thuần bán các sản phẩm thủ công, GIEO phát triển những sản phẩm đương đại nhưng vẫn sử dụng họa tiết và kỹ thuật dệt thổ cẩm truyền thống của người H'Mông, giúp các giá trị thủ công truyền thống trở nên gần gũi và phù hợp hơn với người tiêu dùng trẻ ngày nay. Mỗi sản phẩm được bán ra không chỉ góp phần duy trì nghề dệt truyền thống mà còn trực tiếp hỗ trợ những nữ nghệ nhân đang gìn giữ di sản văn hóa này."
- CTA: "Xem bộ sưu tập / See the collection" → `/collections`

### H3. Partner
- EN: "Our products are developed and produced in partnership with Chie Dù Pù Dù Pà, an enterprise established in 2011 with the mission of accompanying ethnic minority communities in preserving and developing traditional handicrafts, creating sustainable livelihoods, and spreading the beauty of local cultures."
- VI: "Các sản phẩm của GIEO được phát triển và sản xuất thông qua sự hợp tác với Chie Dù Pù Dù Pà, một doanh nghiệp được thành lập vào năm 2011 với sứ mệnh đồng hành cùng cộng đồng các dân tộc thiểu số trong việc gìn giữ và phát triển các nghề thủ công truyền thống, tạo sinh kế bền vững và lan tỏa vẻ đẹp của văn hóa bản địa."

### H4. For the next generation (lead-in to pillars)
- EN: "More importantly, our work is dedicated to empowering the next generation of H'mong girls. We believe every girl should have the opportunity to continue her education, pursue her own career aspirations, and choose her own future, whether that means becoming a skilled brocade artisan, pursuing higher education, starting a business, or following any path she chooses. Alongside educational support, we also provide menstrual hygiene products, health awareness workshops, and self-protection education to equip girls with the knowledge and confidence they need to thrive."
- VI: "Quan trọng hơn, mọi hoạt động của GIEO đều hướng tới trao quyền cho thế hệ nữ sinh H'Mông tiếp theo. GIEO tin rằng mỗi em gái đều xứng đáng có cơ hội được tiếp tục học tập, theo đuổi ước mơ nghề nghiệp và tự lựa chọn tương lai của mình, dù đó là trở thành một nghệ nhân dệt thổ cẩm, tiếp tục học lên cao, khởi nghiệp hay theo đuổi bất kỳ con đường nào mà các em mong muốn. Bên cạnh hỗ trợ giáo dục, GIEO còn cung cấp các sản phẩm vệ sinh kinh nguyệt, tổ chức các buổi nâng cao nhận thức về sức khỏe và giáo dục kỹ năng tự bảo vệ bản thân nhằm trang bị cho các em kiến thức, sự tự tin và khả năng phát triển toàn diện."

### H5. Three pillars (3D Animation 3: the lotus of three)
One petal opens per pillar. Each pillar card is HTML (not 3D text).

**1. Economic Empowerment / Trao quyền kinh tế**
- EN: "We create sustainable income opportunities for H'mong women artisans by designing and marketing modern products that incorporate traditional brocade craftsmanship. By connecting their work with contemporary markets, we help preserve traditional weaving while strengthening financial independence for artisan families."
- VI: "GIEO tạo ra các cơ hội sinh kế bền vững cho các nữ nghệ nhân H'Mông thông qua việc thiết kế và thương mại hóa các sản phẩm hiện đại kết hợp với nghề dệt thổ cẩm truyền thống. Bằng cách kết nối sản phẩm thủ công với thị trường đương đại, GIEO góp phần bảo tồn nghề dệt truyền thống, đồng thời tăng cường sự độc lập về tài chính cho các gia đình nghệ nhân."

**2. Education / Giáo dục**
- EN: "We invest in the education and personal development of artisans' children, particularly girls. Through scholarships, educational support, hygiene products, awareness programs, and life-skills education, we aim to remove barriers that prevent girls from pursuing their education and future ambitions."
- VI: "GIEO đầu tư vào giáo dục và sự phát triển toàn diện của con em các nghệ nhân, đặc biệt là các em gái. Thông qua học bổng, hỗ trợ học tập, cung cấp sản phẩm vệ sinh cá nhân, các chương trình nâng cao nhận thức và giáo dục kỹ năng sống, GIEO hướng tới việc xóa bỏ những rào cản khiến các em không thể tiếp tục con đường học tập và theo đuổi ước mơ của mình."

**3. Mentorship Network / Mạng lưới cố vấn**
- EN: "We are building a long-term mentorship ecosystem where older students, university graduates, and professionals return to inspire and support the next generation. By connecting girls with mentors from diverse backgrounds, we hope to broaden their perspectives, provide career guidance, and foster a cycle of community leadership in which each generation uplifts the next."
- VI: "GIEO xây dựng một hệ sinh thái cố vấn lâu dài, nơi các anh chị học sinh, sinh viên và những người đi trước quay trở về để truyền cảm hứng và đồng hành cùng thế hệ kế tiếp. Thông qua việc kết nối các em gái với những người cố vấn đến từ nhiều lĩnh vực khác nhau, GIEO mong muốn mở rộng góc nhìn, định hướng nghề nghiệp và hình thành một vòng tuần hoàn phát triển cộng đồng, trong đó mỗi thế hệ đều góp phần nâng đỡ và trao cơ hội cho thế hệ tiếp theo."

### H6. Vision and Mission
**Vision / Tầm nhìn**
- EN: "We envision thriving ethnic minority communities where traditional cultural heritage and modern opportunities grow together. Through sustainable economic development, women's empowerment, quality education, and strong community networks, we aspire to create an environment where every H'mong woman and girl has the resources, confidence, and freedom to shape her own future while preserving the cultural identity of her community for generations to come."
- VI: "GIEO hướng tới xây dựng những cộng đồng dân tộc thiểu số phát triển bền vững, nơi các giá trị văn hóa truyền thống và những cơ hội của xã hội hiện đại cùng song hành và phát triển. Thông qua phát triển kinh tế bền vững, trao quyền cho phụ nữ, đầu tư vào giáo dục và xây dựng các mạng lưới cộng đồng vững mạnh, GIEO mong muốn tạo nên một môi trường mà ở đó mọi phụ nữ và trẻ em gái H'Mông đều có đủ nguồn lực, sự tự tin và quyền tự quyết để kiến tạo tương lai của chính mình, đồng thời gìn giữ và phát huy bản sắc văn hóa của cộng đồng cho các thế hệ mai sau."

**Mission / Sứ mệnh**
- EN: "Our mission is to preserve the traditional brocade weaving heritage of the H'mong people by transforming it into products that resonate with modern consumers, creating sustainable livelihoods for women artisans and investing in the next generation. Through economic empowerment, educational opportunities, and mentorship, we seek to build a self-sustaining cycle of community development in which women gain financial independence, girls are empowered to pursue their aspirations, and future generations continue to strengthen and uplift their own communities."
- VI: "Sứ mệnh của GIEO là gìn giữ nghề dệt thổ cẩm truyền thống của người H'Mông bằng cách chuyển hóa những giá trị văn hóa ấy thành các sản phẩm phù hợp với người tiêu dùng hiện đại, qua đó tạo ra sinh kế bền vững cho các nữ nghệ nhân và đầu tư cho thế hệ trẻ. Thông qua ba trụ cột trao quyền kinh tế, giáo dục và mạng lưới cố vấn, GIEO hướng tới xây dựng một mô hình phát triển cộng đồng bền vững, trong đó phụ nữ có được sự độc lập về kinh tế, trẻ em gái được trao cơ hội để theo đuổi ước mơ của mình, và các thế hệ tương lai tiếp tục quay trở về đóng góp, gìn giữ và phát triển chính cộng đồng của mình."

### H7. "This is GIEO, so far." (photo journal)
- Heading EN: "This is GIEO, so far." / VI: "Nhìn lại một mùa GIEO vừa qua."
- Body (from their recap post):
  - EN: "From the first ideas we put together to the people we met along the way, this season has been full of learning, creating, and growing together."
  - VI: "Từ những ý tưởng đầu tiên đến những con người chúng mình gặp trên hành trình, mùa này là một khoảng thời gian của học hỏi, sáng tạo và cùng nhau trưởng thành."
- Gallery: 8 to 14 consented photos from `assets/photos/journal/`. Layout: loose editorial grid with gentle per-image parallax (natural scroll; no horizontal scroll-jack). Launch video embeds here when ready (click-to-play, poster image, no autoplay with sound).
- Closing line: "Here's to everything we've shared, everything we've learned, and everything still waiting to grow." / VI: DRAFT, ask GIEO for their preferred Vietnamese line.

### H8. Get involved + footer
Three cards (DRAFT labels):
- "Mua sản phẩm / Shop the collection" → `/collections` (TODO(shop))
- "Trở thành người cố vấn / Become a mentor" → `/get-involved#mentor` (TODO(mentor))
- "Hợp tác cùng GIEO / Partner with us" → `/get-involved#partner`

Footer: logo (lotus line draws on when footer enters view), email, Instagram, Facebook, "Supported by the IB Global Youth Action Fund", "Products made with Chie Dù Pù Dù Pà", © GIEO 2026.

---

## /about extras: departments (from the Job Description tab)
Community Development · Product Development · Business Development · Marketing (Facebook & Instagram, TikTok, LinkedIn sub-teams) · Media (Photography, Design) · HR. Write each as one short line from the doc; no invented team members.

## /get-involved: community programs mentioned in GIEO's doc (for the mentor/partner section)
Experiential trips to visit artisans and their children · scholarship programs · hygiene education · donations of clothes and personal care products for girls and women · career programs for high school, university and vocational training · financial literacy · English workshops · a buddy system to help children prepare for graduation exams.
Present these as "what we're building", not as completed results, unless GIEO confirms.
