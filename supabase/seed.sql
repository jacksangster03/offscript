-- Seed prompts for OffScript
-- Run after 001_initial.sql migration

insert into public.prompts (topic, category, difficulty, stance_type, prompt_text, context_bullets, retry_angle, tags, active)
values
  ('Urban Beekeeping', 'society', 1, 'argue', 'Should cities actively support urban beekeeping?',
   '["Keeping bee colonies in rooftops and community gardens","May improve pollination in parks and urban green spaces","Used in education and community projects","Some ecologists worry about competition with native bee species"]'::jsonb,
   'Explain urban beekeeping to a 12-year-old and why it might be a good or bad idea.',
   '["ecology","cities","policy"]'::jsonb, true),

  ('Four-Day Work Week', 'society', 1, 'argue', 'Is a four-day work week genuinely better for society, or just better for knowledge workers?',
   '["Several countries have run four-day week pilots","Productivity often stays flat or improves in trials","Works poorly for shift-based and service industries","Raises questions about who benefits most"]'::jsonb,
   'Imagine you are a nurse or a warehouse worker. Make the case for or against a four-day week from that perspective.',
   '["work","economics","wellbeing"]'::jsonb, true),

  ('Phone-Free Schools', 'society', 1, 'argue', 'Should smartphones be banned during school hours?',
   '["France and several US states have introduced bans","Studies link phone use to reduced attention and sleep","Counterarguments around digital literacy and access to information","Enforcement is difficult"]'::jsonb,
   'Make the case for the side you disagree with.',
   '["education","technology","youth"]'::jsonb, true),

  ('Lab-Grown Meat', 'science', 1, 'argue', 'Should lab-grown meat replace conventional animal farming?',
   '["Cultured meat is produced from animal cells without slaughter","Could significantly reduce land use and greenhouse gas emissions","Cost and scale-up remain challenges","Consumer acceptance and regulatory approval vary by country"]'::jsonb,
   'What arguments would a livestock farmer make, and which ones are the strongest?',
   '["food","environment","technology"]'::jsonb, true),

  ('Antibiotic Resistance', 'science', 2, 'explain', 'Why is antibiotic resistance considered one of the greatest threats to global health?',
   '["Overuse in medicine and livestock accelerates resistance","WHO estimates 700,000 deaths per year currently attributable to resistant infections","The pipeline of new antibiotics has nearly stalled","Drug companies have little financial incentive to develop new ones"]'::jsonb,
   'What should one individual do differently? And does it matter?',
   '["health","medicine","global"]'::jsonb, true),

  ('Geoengineering', 'science', 3, 'argue', 'Should humanity attempt to deliberately modify the global climate to counteract warming?',
   '["Solar radiation management proposals include stratospheric aerosol injection","Could rapidly reduce surface temperatures if deployed","Unilateral deployment could affect rainfall patterns globally","Critics call it a dangerous moral hazard that reduces urgency to cut emissions"]'::jsonb,
   'Explain the core tension in one sentence, then expand on whichever side you find harder to argue.',
   '["climate","science","ethics","policy"]'::jsonb, true),

  ('CRISPR Gene Editing', 'science', 3, 'argue', 'Where should society draw the line on human genetic editing?',
   '["CRISPR enables targeted DNA edits with increasing precision","Somatic editing in adults is broadly accepted for disease treatment","Germline editing of inheritable changes remains highly controversial","The 2018 He Jiankui case sparked global scientific condemnation"]'::jsonb,
   'Describe one use case you think should be allowed and one that should not.',
   '["biotech","ethics","medicine"]'::jsonb, true),

  ('Founder Mode', 'business', 1, 'argue', 'Should startup founders stay deeply operational as companies scale, or hand off to professional managers?',
   '["Paul Graham coined founder mode as a counter to conventional management advice","Examples like Jobs and Musk operated with deep product involvement at scale","Delegation failure is a real risk and some founders become bottlenecks","Context matters: B2B SaaS versus consumer tech may require different models"]'::jsonb,
   'Give a concrete example, real or imagined, of a founder who got this wrong in each direction.',
   '["startups","management","leadership"]'::jsonb, true),

  ('Open Source AI Models', 'technology', 2, 'argue', 'Should powerful AI models be open-sourced, or does that pose unacceptable risks?',
   '["Meta Llama models are open weights; OpenAI and Anthropic keep weights closed","Open models allow safety research, localisation, and independent study","They also allow fine-tuning for harmful uses without guardrails","The dual-use tension mirrors debates about open-source security tools"]'::jsonb,
   'What conditions, if any, would make you comfortable with fully open powerful models?',
   '["AI","safety","technology","policy"]'::jsonb, true),

  ('Attention Economy', 'technology', 2, 'argue', 'Are social media platforms structurally incapable of acting in users'' genuine interests?',
   '["Platforms are optimised for engagement, not wellbeing","Internal documents at Meta showed awareness of Instagram effects on teenage girls","Regulatory pressure is increasing in EU and US","Some argue better design choices are possible without destroying business models"]'::jsonb,
   'Design one specific change to a major platform that would improve this.',
   '["technology","social media","regulation"]'::jsonb, true),

  ('AI Moral Status', 'ethics', 3, 'argue', 'Could an AI system ever deserve moral consideration, and if so, what would that require?',
   '["Moral status usually requires sentience: the ability to suffer or experience","Large language models exhibit no confirmed internal experience","The hard problem of consciousness means we cannot verify subjective states from behaviour","Some philosophers argue functional analogues to emotion may be sufficient"]'::jsonb,
   'Argue the position you find least plausible.',
   '["AI","ethics","philosophy","consciousness"]'::jsonb, true),

  ('Obligatory Altruism', 'ethics', 3, 'argue', 'Do affluent people have a moral obligation to give significantly to global poverty relief?',
   '["Peter Singer''s drowning child argument extends across distance","Effective altruism calculates marginal utility of donations across causes","Critics argue it demands too much and ignores local obligations","The question of how much is enough has no clean answer"]'::jsonb,
   'What objection to Singer''s argument do you find most persuasive, and why?',
   '["ethics","philosophy","poverty","giving"]'::jsonb, true),

  ('Cultural Appropriation', 'culture', 2, 'argue', 'Is there a meaningful distinction between cultural appropriation and cultural exchange?',
   '["Critics focus on power imbalances and commercial exploitation","Defenders argue all culture is historically mixed and exchange enriches everyone","Context matters: wearing a Halloween costume vs high fashion borrowing from indigenous art","Hard to police without essentialising cultures as static and bounded"]'::jsonb,
   'Give one example of clearly acceptable exchange and one of clearly problematic appropriation.',
   '["culture","ethics","identity"]'::jsonb, true),

  ('Reparations for Historical Injustices', 'history', 3, 'argue', 'Can reparations for historical injustices like slavery ever be practically or morally meaningful?',
   '["Several US cities and states are studying reparations frameworks","Germany has paid reparations to Holocaust survivors","Questions of who pays, who receives, and over what time horizon are contested","Some argue structural reform is more meaningful than direct payments"]'::jsonb,
   'Separate the moral question from the practical one. Which is easier to answer?',
   '["history","ethics","race","policy"]'::jsonb, true),

  ('Meritocracy', 'debate', 3, 'argue', 'Is meritocracy a genuine system of fairness or a way of legitimising existing advantages?',
   '["Coined by Michael Young in 1958 as a satirical warning, not an ideal","Research shows family background strongly predicts outcomes even in high-mobility countries","Believers argue it at least moves beyond hereditary privilege","Critics argue it disguises luck and structural advantage as personal virtue"]'::jsonb,
   'What would a truly fair selection system look like, practically?',
   '["society","ethics","economics","debate"]'::jsonb, true),

  ('Optimism as Strategy', 'absurd', 2, 'argue', 'Is optimism a rational strategy or a cognitive bias we should overcome?',
   '["The optimism bias is well-documented: people overestimate positive outcomes","Research links optimism to better health, resilience, and negotiation outcomes","Unrealistic optimism causes poor planning and risk management","Defensive pessimism is a legitimate alternative strategy for some people"]'::jsonb,
   'When does optimism become delusional? Give a specific threshold.',
   '["psychology","decision-making","strategy"]'::jsonb, true),

  ('The Value of Boredom', 'absurd', 2, 'argue', 'Is boredom underrated, and should we protect it?',
   '["Research links unstructured boredom to creativity and problem-solving","Smartphones have nearly eliminated idle, unstimulated time","Schools and employers often treat boredom as a failure state","Children''s unsupervised play has declined dramatically since the 1980s"]'::jsonb,
   'Design a policy that would protect or restore boredom in modern life.',
   '["psychology","culture","technology"]'::jsonb, true),

  ('Being Wrong', 'absurd', 4, 'argue', 'Make the best possible argument that it is good to be wrong.',
   '["Being wrong provides information that being right does not","Cultures that punish wrongness reduce risk-taking and disclosure","Scientific progress depends on falsifiability: experiments designed to fail","Kathryn Schulz argues being wrong feels exactly like being right until it does not"]'::jsonb,
   'How does this apply to how you personally learn?',
   '["psychology","growth","absurd"]'::jsonb, true),

  ('Convince Me in 60 Seconds', 'debate', 4, 'argue', 'Convince me that something most people consider boring is secretly fascinating.',
   '["Choose any topic: tax law, concrete, sand, spreadsheets","Constraint: you cannot use the word actually","You have 60 seconds and no preparation","The test is whether you can generate genuine interest, not fake enthusiasm"]'::jsonb,
   'Pick a different boring topic and go again.',
   '["communication","creativity","debate","pressure"]'::jsonb, true),

  ('Your Greatest Weakness', 'interview', 1, 'explain', 'Tell me about a significant professional weakness and what you have done about it.',
   '["Interviewers are testing self-awareness and honesty","They want real weaknesses, not strengths in disguise","Evidence of action taken on the weakness matters","Balance: honest without disqualifying"]'::jsonb,
   'Answer it for a completely different weakness.',
   '["interview","self-awareness","career"]'::jsonb, true),

  ('Disagree with a Manager', 'interview', 2, 'explain', 'Tell me about a time you disagreed with your manager and how you handled it.',
   '["Tests assertiveness, diplomatic communication, and professional maturity","Interviewers want to see you can push back constructively","Outcome matters but process matters more","Avoid stories that make you sound difficult or your manager incompetent"]'::jsonb,
   'What did the experience teach you about how to raise disagreement effectively?',
   '["interview","leadership","communication"]'::jsonb, true),

  ('Nuclear Energy Revival', 'science', 2, 'argue', 'Should nuclear energy be central to the clean energy transition?',
   '["Nuclear produces no direct carbon emissions during operation","Three Mile Island, Chernobyl, and Fukushima shaped public perception strongly","New small modular reactor designs promise cheaper, faster builds","Waste storage remains a politically and technically unsolved problem"]'::jsonb,
   'Steelman the anti-nuclear case using only evidence from after 2010.',
   '["energy","environment","policy"]'::jsonb, true),

  ('Rules vs Intuition', 'absurd', 3, 'argue', 'Should you follow a rule you know is wrong in a specific situation?',
   '["Rules exist because individual judgement is often biased and self-serving","Exceptions that seem obvious often lead to rule breakdown over time","Emergency ethics literature explores this: when should doctors break confidentiality?","Bureaucratic rule-following has caused documented harms in history"]'::jsonb,
   'Give a situation where breaking the rule was clearly right, and one where it was clearly wrong.',
   '["ethics","philosophy","decision-making"]'::jsonb, true),

  ('Free Speech Limits', 'debate', 2, 'argue', 'Where should the line be drawn on what speech is acceptable in a democracy?',
   '["First Amendment absolutism contrasts with European hate speech laws","Platforms now make de facto speech policy through moderation decisions","Incitement to violence is almost universally restricted","Disinformation and coordinated inauthentic behaviour raise new challenges"]'::jsonb,
   'Describe one type of speech you find offensive but would defend the right to make.',
   '["politics","law","ethics","debate"]'::jsonb, true),

  ('The Ship of Theseus', 'absurd', 3, 'argue', 'If you replace every part of something, is it still the same thing? Does the answer change for people?',
   '["The ship of Theseus paradox asks about identity through change","Human cells are largely replaced over years; neurons persist longer","Legal identity persists despite physical change","The question matters in: transplants, AI continuity, corporate identity, art authentication"]'::jsonb,
   'Apply this to personal identity: are you the same person you were at age 10?',
   '["philosophy","identity","absurd"]'::jsonb, true),

  ('Persuasion vs Manipulation', 'ethics', 3, 'argue', 'What is the difference between persuasion and manipulation? Is there a clean line?',
   '["Both aim to change beliefs or behaviours without force","Classical distinction: persuasion appeals to reason; manipulation bypasses it","Advertising, political campaigns, and therapists all operate in a grey area","Informed consent is one proposed criterion: does the target know what is happening?"]'::jsonb,
   'Is self-persuasion, reframing for motivation, manipulation?',
   '["ethics","communication","psychology"]'::jsonb, true);
