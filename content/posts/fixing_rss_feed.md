+++
title = "The RSS feed is (hopefully) fixed!"
date = "2023-11-15"
tags = ["hugo", "meta"]
+++

Earlier this year, while at [CppNow], I completely broke the [RSS feed] for this
blog. Really sorry about that, and thanks to [Jonathan] for pointing it out.
However, I have been distracted with work, life, and a bunch of complications
over the intervening months and have only now managed to fix it. I hope? Let's
hope.

[CppNow]: https://cppnow.org/
[RSS feed]: https://chandlerc.blog/index.xml
[Jonathan]: https://www.foonathan.net/

As is all-too-common, the fix was easy once I understood _how_ to fix it and
understood the surprising constraints on how to add that fix to the blog
infrastructure.

## Excessive details about this mystery...

Some context on the blog's infrastructure: I'm using the [Hugo] static site
generator to build the site, and doing so with both a _blog_ theme and a
_presentation_ theme. The blog theme is the main one you're probably reading
right now, and is based on the [PaperMod] theme. The presentation theme is
actually the main reason I'm using Hugo -- [reveal-hugo], which unsurprisingly
combines Hugo's static site generation with [Reveal.js] slides. As a side note,
reveal-hugo is amazing! =D

[Hugo]: https://gohugo.io/
[PaperMod]: https://github.com/adityatelange/hugo-PaperMod
[reveal-hugo]: https://github.com/dzello/reveal-hugo
[Reveal.js]: https://revealjs.com/

Now, the problem is that the _slides_ section of this static site was still
traversed by the _blog_ theme, even though it had a custom output format to
create the Reveal.js-powered slides instead of rendering as part of the blog.
When the slides were traversed, it included each of the "pages" there into the
generated RSS feed. And because of how reveal-hugo works, each section of each
presentation looked like a "page", creating a **huge** number of very strangely
formatted blog "posts" in the RSS feed.

Sadly, Hugo doesn't have any way to filter the pages used for a particular
output format -- everything gets sent to the RSS template if you enable that
output centrally. This is also why the slides have to manually enable the
Reveal.js output on each page. There was a [bug][hugo-bug] requesting this, but
it sat without update for a year until their bot marked it stale. =[

[hugo-bug]: https://github.com/gohugoio/hugo/issues/10224

Luckily for me, just after the bug was marked stale, the original person who
filed the bug posted that they had worked around this by customizing their RSS
template to do the filtering within the RSS template itself. They [helpfully][1]
provided a link to [their code][2] doing this filtering which helped me
understand how to fix the issue. The Hugo folks confirmed (finally) that in fact
this is the preferred way to handle things.

[1]: https://github.com/gohugoio/hugo/issues/10224#issuecomment-1700388005
[2]:
  https://github.com/willfaught/paige/blob/master@%7B2023-08-31T05:26:20Z%7D/layouts/_default/rss.xml#L11

But in another sad realization, Hugo also makes it somewhat awkward to edit
templates beyond setting explicit variables or filling in extension points that
the template provides. They are loaded as Go modules into the Hugo system, and
so have to either be their own repository or be located at a specific path.
Because the template is someone else's work, I wanted it to live alongside the
other `third_party` code in my blog's repository which doesn't play nicely with
the expected path. The Hugo module system provides a [mount][hugo-mount] feature
that seemed like it might provide the path re-mapping needed, but it turns out
to be unable to redirect paths for finding modules in the first place. =[

[hugo-mount]:
  https://gohugo.io/hugo-modules/configuration/#module-configuration-mounts

I ended up needing to fork the theme into the repository, use a symlink to
stitch it into the correct location, and then apply the fixes to the theme to
work around the Hugo limitation. Of course, once all was said and done it seemed
quite easy. But getting to the point where it was easy... well, wasn't easy for
me. ;]

Anyways, hopefully it is now fixed. I'm going to try to start posting again
regularly. Just wanted to share this update to let folks know, leave some
documentation of what all went into fixing this, and also to find out if there
are any other issues that need fixing. Happy to have issues or even PRs fixing
things here: https://github.com/chandlerc/blog
