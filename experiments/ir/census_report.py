import glob, collections, sys
S=sys.argv[1]
STRUCT=('classMethod','nestedDef')
# What is still TEXT (P0.2): rows importlib records beside the def reasons.
# None of them is a top-level def, so every def total below leaves them out.
TEXT_PREFIXES=('ms:','cs:','th:','in:','lit:','by:','tx:')
def is_text_row(k): return k.startswith(TEXT_PREFIXES)
def is_cm(k): return k=='classMethod' or k.startswith('cm:')
def load(files):
    """Corpus totals, examples, per-module rows, and import failures.

    TOTALS COME FROM THE PER-MODULE ROWS, NOT FROM THE CENSUS| LINES, and each
    module is taken ONCE however many session files mention it.  The test
    corpus is measured in three sessions (census_tests_00..02.tpz) because one
    session cannot hold it, and every session compiles the stdlib its own
    modules import -- so a module pulled in by two shards appears in both, and
    summing the CENSUS| lines would count it twice.  Deduplicating here is what
    makes the board independent of how the manifest is split: three shards,
    five, or one all produce the same numbers.

    This is exact rather than approximate: importlib's census records every
    count into #byModule under the same (module, reason) key it uses for
    #counts, so summing the deduplicated per-module rows reconstructs the
    session totals.  assert_totals_match() below checks that on the one corpus
    measured in a single session, where the two must agree exactly.
    """
    ex={}; bym={}; fails=[]; per_file_counts=[]
    for f in files:
        fc=collections.Counter()
        for l in open(f):
            l=l.rstrip('\n')
            if l.startswith('CENSUS|'):
                _,k,n,e=l.split('|',3); fc[k]+=int(n)
                # Union across sessions, then sorted and trimmed below: which
                # session saw a reason first depends on the split, and the board
                # must not.
                ex.setdefault(k,set()).update(x for x in e.split(';') if x)
            elif l.startswith('MODULE|'):
                _,m,k,n=l.split('|',3)
                bym.setdefault(m,collections.Counter())[k]=int(n)
            elif l.startswith('IMPORTFAIL|'):
                fails.append(l.split('|',2)[1])
        per_file_counts.append(fc)
    ex={k:';'.join(sorted(v)[:5]) for k,v in ex.items()}
    counts=collections.Counter()
    for m,c in bym.items():
        for k,n in c.items(): counts[k]+=n
    return counts,ex,bym,fails,per_file_counts

def assert_totals_match(label,counts,per_file_counts):
    """A single-session corpus must reconstruct exactly from its module rows.

    The control for the deduplication above.  With one session there is nothing
    to deduplicate, so the two ways of counting have to agree; if they ever
    stop agreeing, importlib has begun recording a count without a module
    (or with the wrong one) and every number here is quietly wrong.
    """
    if len(per_file_counts)!=1: return
    direct=per_file_counts[0]
    bad=sorted(k for k in set(direct)|set(counts) if direct[k]!=counts[k])
    if bad:
        raise SystemExit('%s: per-module rows disagree with the session totals '
                         'for %s -- census recording is broken, not the report'
                         % (label,', '.join('%s (%d vs %d)'%(k,direct[k],counts[k]) for k in bad)))
def _shard_rows(files):
    seen=collections.defaultdict(dict)
    for f in files:
        for l in open(f):
            if l.startswith('MODULE|'):
                _,m,k,n=l.rstrip('\n').split('|',3)
                seen[m].setdefault(f,{})[k]=int(n)
    return seen
def _multi_shard_modules(files):
    return sum(1 for m,d in _shard_rows(files).items() if len(d)>1)
def _inflation(files):
    seen=_shard_rows(files)
    summed=sum(n for m,d in seen.items() for r in d.values() for n in r.values())
    dedup=sum(n for m,d in seen.items() for n in list(d.values())[0].values())
    return summed/dedup if dedup else 1.0
def top_total(c): return sum(n for k,n in c.items() if k not in STRUCT and not k.startswith('cm:') and not is_text_row(k))
def cm_total(c): return sum(n for k,n in c.items() if is_cm(k))
def ranked(c):
    "Rows in a deterministic order: commonest first, ties broken by name.\n\n    Counter.most_common() leaves ties in insertion order, which depends on the\n    order modules were discovered and so on how the manifest was split.  The\n    counts do not depend on the split and the row order must not either."
    return sorted(c.items(),key=lambda kv:(-kv[1],kv[0]))
def table(c,ex,total):
    out=['| defs | share of top-level | reason | examples |','| ---: | ---: | --- | --- |']
    for k,n in ranked(c):
        if k in STRUCT or k.startswith('cm:') or is_text_row(k): continue
        exs=', '.join(e for e in ex.get(k,'').split(';') if e)[:120]
        out.append(f'| {n} | {100*n/total:.1f}% | `{k}` | {exs} |')
    return '\n'.join(out)
def explain(c,label):
    t=top_total(c); comp=c['compiled']; cm=cm_total(c); nd=c['nestedDef']
    cme=c.get('cm:eligible',0)
    alld=t+cm+nd
    return (f'**{label}**: {t} top-level defs, **{comp} compiled through IR ({100*comp/t:.1f}%)**; '
            f'{cm} class-body methods, of which **{cme} are IR-eligible ({100*cme/cm:.1f}%)** through the class-method seam (cut 36); '
            f'{nd} nested defs/lambdas. Of all {alld} defs the corpus holds, {100*(comp+cme)/alld:.1f}% go through IR.')
def cm_table(c,ex):
    tot=cm_total(c)
    out=['| methods | share of class methods | reason | examples |','| ---: | ---: | --- | --- |']
    for k,n in ranked(c):
        if not k.startswith('cm:'): continue
        exs=', '.join(e for e in ex.get(k,'').split(';') if e)[:120]
        out.append(f'| {n} | {100*n/tot:.1f}% | `{k[3:]}` | {exs} |')
    return '\n'.join(out)

# ---------------------------------------------------------------------------
# What is still text (plan item P0.2)
# ---------------------------------------------------------------------------
# Every compile of generated Smalltalk is tallied once, as by:<kind> (its
# characters) and tx:<kind> (one per compile), at the place that hands the
# source to the compiler.  Each kind falls in exactly one group, so the groups
# add up to the total; the ``of which'' rows below split the module body and
# are NOT added again.
#   translated  Python translated to Smalltalk text: what P3-P6 move to IR
#   twin        the text form of a method already built through IR, compiled
#               only so text consumers can read it back (P2, P4.6, P6)
#   support     templated code Grail fills in: stays generated Smalltalk
TRANSLATED={
    'moduleBody':'module body `initialize` (module statements, module-level class builds)',
    'rt:Grail-Class Methods':'class-body defs compiled from text at class build (carry `<grailPython>`)',
    'rt:Grail-MI-Inherited':'methods copied by recompiling their text (MI merge)',
    'classHelper':'method-local class helpers (cut 76)',
    'doit':'`exec` / `eval` doits run during the import',
    'topLevelDef':'top-level defs compiled as text',
}
TWIN={
    'rt:Grail-IR Text Sources':'`___irTextSources___` tables (text twins of IR methods)',
}
def kind_group(k):
    if k in TRANSLATED: return 'translated'
    if k in TWIN: return 'twin'
    return 'support'
def mb(n): return f'{n/1e6:.2f}'
def text_section(c,label):
    by={k[3:]:n for k,n in c.items() if k.startswith('by:') and k.count(':')>=1}
    tx={k[3:]:n for k,n in c.items() if k.startswith('tx:')}
    # sub-rows of the module body are not compiles of their own
    subs={k:by.pop(k) for k in list(by) if k in ('moduleBody:classBuild','doit:classBuild')}
    total=sum(by.values())
    g=collections.Counter()
    for k,n in by.items(): g[kind_group(k)]+=n
    out=[f'### Bytes of generated Smalltalk compiled ({label})\n']
    out.append(f'**{mb(total)} MB of generated Smalltalk source was handed to the compiler**: '
               f'**{mb(g["translated"])} MB ({100*g["translated"]/total:.0f}%) is translated Python**, '
               f'{mb(g["twin"])} MB ({100*g["twin"]/total:.0f}%) is the text twin of methods already built through IR, '
               f'and {mb(g["support"])} MB ({100*g["support"]/total:.0f}%) is templated support code that stays. '
               f'Characters, counted where the source is compiled; one per character for a non-ASCII literal.\n')
    out.append('| group | kind | compiles | MB | share |')
    out.append('| --- | --- | ---: | ---: | ---: |')
    def row(grp,k,desc):
        n=by.get(k,0)
        out.append(f'| {grp} | {desc} | {tx.get(k,0)} | {mb(n)} | {100*n/total:.1f}% |')
    for k,d in TRANSLATED.items(): row('translated',k,d)
    for k,d in TWIN.items(): row('twin',k,d)
    sup=sorted(((n,k) for k,n in by.items() if kind_group(k)=='support'),reverse=True)
    for n,k in sup[:8]: row('support',k,f'`{k[3:] if k.startswith("rt:") else k}`')
    rest=sup[8:]
    if rest:
        n=sum(x for x,_ in rest)
        out.append(f'| support | {len(rest)} smaller kinds | {sum(tx.get(k,0) for _,k in rest)} | {mb(n)} | {100*n/total:.1f}% |')
    out.append('')
    mbody=by.get('moduleBody',0)
    if mbody:
        cb=subs.get('moduleBody:classBuild',0); lir=c.get('lit:IR',0); ltx=c.get('lit:text',0)
        out.append(f'Of the {mb(mbody)} MB of module bodies, **{mb(cb)} MB ({100*cb/mbody:.0f}%) is module-level class statements**; '
                   f'the remaining {mb(mbody-cb)} MB is every other module statement. Inside class builds (module-level or not), '
                   f'{mb(lir)} MB is the text literal each IR install carries (`in:IR+literal` below) and '
                   f'{mb(ltx)} MB is the source of methods compiled from text at class build.\n')
    return '\n'.join(out)
def kind_table(c,prefix,head):
    rows=sorted(((n,k[len(prefix):]) for k,n in c.items() if k.startswith(prefix)),key=lambda r:(-r[0],r[1]))
    tot=sum(n for n,_ in rows)
    out=[f'| {head} | count | share |','| --- | ---: | ---: |']
    for n,k in rows: out.append(f'| `{k}` | {n} | {100*n/tot:.1f}% |')
    out.append(f'| **total** | **{tot}** | |')
    return '\n'.join(out)
def install_table(c):
    ir=c.get('in:IR+literal',0); txt=c.get('in:Grail-Class Methods',0)
    sup=sum(n for k,n in c.items() if k.startswith('in:') and k not in ('in:IR+literal','in:Grail-Class Methods'))
    out=['| install statement in a class build | count | literal MB |','| --- | ---: | ---: |']
    out.append(f'| IR build, carrying its text twin as a literal (`___irInstallDef:on:or:category:`) | {ir} | {mb(c.get("lit:IR",0))} |')
    out.append('| direct IR install, no literal (P4.6) | 0 | 0.00 |')
    out.append(f'| `Grail-Class Methods` compiled from text (a varargs/bigmem/skip forwarder, or a def the seam refuses) | {txt} | |')
    out.append(f'| synthesized support methods compiled from text (accessors, tables, instantiation, ...) | {sup} | |')
    out.append(f'| (all text-compile literals) | {txt+sup} | {mb(c.get("lit:text",0))} |')
    return '\n'.join(out)
def text_board(c,label):
    out=[text_section(c,label)]
    out.append(f'### Module statements ({label})\n')
    out.append('Every top-level statement of every module compiled, by kind. **All of them are text today**: the module body is one text `initialize` (P4). A top-level `def` is a statement here too -- it binds the name in `initialize` -- while its own method is IR.\n')
    out.append(kind_table(c,'ms:','statement')+'\n')
    out.append(f'### Class-body statements ({label})\n')
    out.append('Every statement directly in a class body, by kind, wherever the class is. **All are emitted as text** (P3): a def\'s method is built through IR, but the statement that installs it is text in the class build.\n')
    out.append(kind_table(c,'cs:','statement')+'\n')
    th=c.get('th:helper',0)
    out.append(f'### Text-helper class builds ({label})\n')
    out.append(f'**{th}** class statements in an IR-built def were built as a compiled-text helper method (cut 76), '
               f'{mb(c.get("by:classHelper",0))} MB over {c.get("tx:classHelper",0)} helper compiles. '
               'Their enclosing defs count as `compiled` above, so this is the row that shows them. '
               'Counted where the helper is built during the import; a deferred helper compiled at call time is not.\n')
    out.append(f'### Class-method installs ({label})\n')
    out.append(install_table(c)+'\n')
    return '\n'.join(out)
def biggest_bodies(bym,n=10):
    rows=sorted(((c.get('by:moduleBody',0),c.get('by:moduleBody:classBuild',0),m) for m,c in bym.items()),reverse=True)[:n]
    out=['| module | `initialize` MB | class statements MB |','| --- | ---: | ---: |']
    for b,cb,m in rows: out.append(f'| {m} | {mb(b)} | {mb(cb)} |')
    return '\n'.join(out)

std=load([S+'/census_stdlib.out'])
tst=load(sorted(glob.glob(S+'/census_tests_0*.out')))
assert_totals_match('stdlib corpus',std[0],std[4])
if not tst[2]:
    raise SystemExit('no census_tests_0*.out in %s -- run experiments/ir/'
                     'census_tests_00..02.tpz before the report, or it would '
                     'write a board with an empty test corpus' % S)
# split the test corpus: modules named test.* vs everything they pulled in
tonly=collections.Counter(); tex={}
for m,c in tst[2].items():
    if m.startswith('test.'):
        for k,n in c.items(): tonly[k]+=n
for k in tonly: tex[k]=tst[1].get(k,'')
lines=[]
lines.append('# IR eligibility census\n')
lines.append('How much real code the direct-to-IR path (`GRAIL_IR_CODEGEN`) actually compiles, and what blocks the rest, ranked by the number of defs each missing shape blocks. This is the progress metric for the migration and the source of the roadmap table in MIGRATION.md.\n')
lines.append('## Method\n')
lines.append('`FunctionDefAst>>___irIneligibilityReason___` answers the first refusing test of the eligibility predicate as a Symbol (`___irEligible___` is its `isNil`). With `importlib ___irCensusOn: true` the seam in `___buildModuleClassBody:name:` tallies one row per top-level def -- `compiled`, `fallback` (eligible but the IR build raised), or the reason -- plus every class-body method (`classMethod`, never routed through the seam) and every def or lambda nested in a top-level def (`nestedDef`). A body refusal names the first refusing node: `stmt:X` / `value:X` for a node class with no IR predicate at all, `X:detail` for a handled class refusing one particular form. `importlib ___irCensus___` holds `#counts`, `#examples` (five `module.def` names per reason) and `#byModule`.\n')
lines.append('Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: `census_stdlib.tpz` imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and `census_tests_00..02.tpz` import every module of `scripts/cpython_suite_manifest.txt`, round-robin across three sessions because one session cannot hold the whole manifest. Each script reads its module list at run time, so adding a module to the manifest needs no edit here. The stdlib corpus takes about two minutes, each test shard several.\n')
lines.append("""**They need the suite's gem configuration, not topaz's defaults.** Under a bare
`topaz -l` the manifest shards die partway with `OutOfMemory old space overflow`
/ `VM temporary object memory is full` (error 4067) -- which looks like a census
bug and is not. Run them the way the suite runner does:

```bash
CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=1800000;GEM_MAX_SMALLTALK_STACK_DEPTH=80000;"
$GEMSTONE/bin/topaz -lq -C "$CFG" -S experiments/ir/census_tests_00.tpz < /dev/null
```

The cache is TWICE the suite's 900000 KB now: the manifest has grown to 200
modules, and on 2026-10-30 shard 1's 67 died at 900000 with old space full
(675 MB, error 4067) while shards 0 and 2 completed. At 1800000 all three do.

This paragraph is EMITTED BY `census_report.py`, not hand-written here: the
report rewrites `CENSUS.md` wholesale, so prose added to the board by hand is
silently dropped by the next regeneration.  Anything worth keeping goes in the
generator.
""")
lines.append('**Each module is counted once, however many sessions compiled it.** Every session compiles the stdlib its own modules import, so a module reached from two shards is measured in both; this report therefore builds the corpus totals from the per-module rows rather than by summing the session totals. It matters here: of the %d modules the test corpus touches, %d are reached from more than one shard, and summing them -- which is what produced the boards before this was fixed -- overstates the corpus by about half. The shards agree exactly on every module they share, so which copy is taken makes no difference, and ANY split of the manifest gives the same board; that is checked by running one.\n'
    % (len(tst[2]), _multi_shard_modules(sorted(glob.glob(S+'/census_tests_0*.out')))))
lines.append('Counts here are exact and reproducible; the EXAMPLE names beside each reason are not. importlib keeps only the first five it sees per reason per session, so which five reach the board depends on the order modules were compiled. They illustrate a reason; they never enumerate it.\n')
lines.append('## Corpus 1: the vendored stdlib (125 top-level imports)\n')
lines.append(explain(std[0],'stdlib')+'\n')
lines.append(table(std[0],std[1],top_total(std[0]))+'\n')
lines.append('### Class-body methods (stdlib corpus)\n')
lines.append('What the class-method seam (cut 36) admits and what refuses the rest; `eligible` means built through IR at class-definition time.\n')
lines.append(cm_table(std[0],std[1])+'\n')
lines.append('## Corpus 2: the CPython test modules of the suite manifest\n')
lines.append(f'Importing the {sum(1 for m in tst[2] if m.startswith("test."))+len(tst[3])} manifest modules compiles them AND the stdlib they pull in; {len(tst[3])} failed to import for pre-existing reasons unrelated to IR ({", ".join(sorted(tst[3]))}).\n')
lines.append(explain(tst[0],'test corpus, everything compiled')+'\n')
tt=top_total(tonly)
lines.append(f'**`test.*` modules alone**: {tt} top-level defs, {tonly["compiled"]} compiled ({100*tonly["compiled"]/tt:.1f}%); {cm_total(tonly)} class methods (test code is almost entirely TestCase methods), of which {tonly.get("cm:eligible",0)} IR-eligible; {tonly["nestedDef"]} nested.\n')
lines.append(cm_table(tonly,tex)+'\n')
lines.append(table(tonly,tex,tt)+'\n')
# per-module ranking (stdlib corpus)
lines.append('## Per-module coverage (stdlib corpus)\n')
lines.append('Top-level defs only. Modules with at least 10 top-level defs, by share compiled.\n')
lines.append('| module | top-level defs | compiled | share | class methods | biggest blocker |\n| --- | ---: | ---: | ---: | ---: | --- |')
rows=[]
for m,c in std[2].items():
    t=top_total(c)
    if t>=10:
        blk=max(((n,k) for k,n in c.items() if k not in STRUCT and k!='compiled' and not is_text_row(k)),default=(0,'-'))
        rows.append((c['compiled']/t,t,m,c['compiled'],cm_total(c),blk))
rows.sort(key=lambda r:(-r[0],-r[1]))
for share,t,m,comp,cm,blk in rows:
    lines.append(f'| {m} | {t} | {comp} | {100*share:.0f}% | {cm} | `{blk[1]}` ({blk[0]}) |')
lines.append('')
lines.append('## What is still text\n')
lines.append('The def rows above say which METHODS go through IR. Everything else Grail compiles is still Smalltalk text: module bodies, class bodies, method-local class helpers, doits, the text twin each IR method carries, and templated support code. These rows measure it (plan item P0.2). The flags are the same: IR forced on, census on, imports only. `importlib ___irCensus___` holds them beside the def reasons as `ms:` (module statements), `cs:` (class-body statements), `th:helper`, `in:` (install statements), `lit:` (their literals) and `by:` / `tx:` (characters and compiles per kind of compiled source).\n')
lines.append('**Bytes are counted per compile, so a corpus figure is what an import of it compiles.** A class-body method compiled from text is counted twice, honestly: once as a literal inside the module body, and again when the class build compiles it. The `by:rt:` kinds are compiles made while a module body runs (`Behavior >> ___compileMethod:category:scope:`), attributed to that module; a handful made outside any import are attributed to `?`.\n')
lines.append('## Corpus 1 (stdlib): what is still text\n')
lines.append(text_board(std[0],'stdlib')+'\n')
lines.append('Largest module bodies, stdlib corpus:\n')
lines.append(biggest_bodies(std[2])+'\n')
lines.append('## Corpus 2 (test corpus, everything compiled): what is still text\n')
lines.append(text_board(tst[0],'test corpus')+'\n')
lines.append('Largest module bodies, test corpus:\n')
lines.append(biggest_bodies(tst[2])+'\n')
open('experiments/ir/CENSUS.md','w').write('\n'.join(lines))
print(explain(std[0],'stdlib')); print(explain(tst[0],'tests all')); print(f'test.* only: {tt} defs, {tonly["compiled"]} compiled, cm {tonly["classMethod"]}')
print(table(tonly,tex,tt)[:1500])
