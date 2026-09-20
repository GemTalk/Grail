## Progress — cut 41 (`*args` and `**kwargs`)

The two collectors, appended to cut 40's prologue where the text appends them
(after the positional binding; the keyword-only binding of cut 42 goes between
them):

    args := tuple perform: #withAll: env: 0 withArguments: { positional copyFrom: 3
        to: positional size }.                                    *vararg
    kwargs := (___kw___ ifNil: [(PyDict perform: #new env: 0)]) copy.
    kwargs removeKey: 'k' ifAbsent: [].  kwargs removeKey: 'a' ifAbsent: [].   **kwarg

The vararg is the positional tail as a tuple -- TupleAst's env-0 `withAll:`
over `copyFrom:to:`.  The **kwarg is a COPY of the caller's dict (never
mutated) with every name the prologue already bound removed: the keyword-only
names first, then the regular positional ones; positional-only names stay,
since a keyword spelled like one legitimately lands there (cut 43 admits
those).  `removeKey:ifAbsent: []` takes an EMPTY block, which the IR accepts as
a GsComBlockNode with no statements -- exactly what source compilation
produces for `[]`.

The guards adapt as the text's do: `*args` absorbs the positional tail, so the
too-many-positional check is not emitted; `**kwargs` collects unknown keywords,
so the unexpected-keyword check is not.  The `kwargs`-vs-`___kw___` method
argument rename (cut 40) is what makes `def f(**kwargs)` work at all: the
user's `kwargs` is the temp, the incoming dict arrives as `___kw___`; the
fixture's `star_named_collision(*positional, **kwargs)` renames both.

Fixture: star_args, star_kwargs (sorted items), star_both, star_defaults (a
default before the star), star_named_collision, star_calls (nine call routes),
star_errors (the four TypeError messages, verbatim); compiled 146 -> 153.

Cut 41 flag-on sweep: the known families, plus two things worth naming.  (1) A
NEW member of the PEP 657 column family: `LambdaFrameTestCase>>
testLambdaFrameSpans` (and, behind it, `a_nested_lambda_spans_its_own_body`)
-- the fixture's `def _boom(*args): return 1 / 0` is IR-compiled now, and its
frame reads `('_boom', None)` where the check wants the columns of `1 / 0`; the
lambda frames themselves are right.  (2) One `AlmostOutOfMemory` ERROR
(`SmalltalkForwarderTestCase>>testStaticmethodDerivedForwarder`, signalled
during a cold import) after which EVERY remaining test of that shard -- 102,
S through W -- ERRORed with `CompileError 1001, undefined symbol ...` on its
fixture module's compile; all eight of the classes sampled pass alone in a
fresh forced-flag session.  The pressure effect in a more expensive form than
the one-test hits of cuts 29-34: the notification's unload evidently leaves
the shard's compile scope broken, so the ``on: AbstractException'' follow-up
recorded under cut 29 has a larger cost than was known.
