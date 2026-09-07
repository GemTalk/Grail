import glob, collections, sys
S=sys.argv[1]
STRUCT=('classMethod','nestedDef')
def load(files):
    counts=collections.Counter(); ex={}; bym=collections.defaultdict(collections.Counter); fails=[]
    for f in files:
        for l in open(f):
            l=l.rstrip('\n')
            if l.startswith('CENSUS|'):
                _,k,n,e=l.split('|',3); counts[k]+=int(n); ex.setdefault(k,e)
            elif l.startswith('MODULE|'):
                _,m,k,n=l.split('|',3); bym[m][k]+=int(n)
            elif l.startswith('IMPORTFAIL|'):
                fails.append(l.split('|',2)[1])
    return counts,ex,bym,fails
def top_total(c): return sum(n for k,n in c.items() if k not in STRUCT)
def table(c,ex,total):
    out=['| defs | share of top-level | reason | examples |','| ---: | ---: | --- | --- |']
    for k,n in c.most_common():
        if k in STRUCT: continue
        exs=', '.join(e for e in ex.get(k,'').split(';') if e)[:120]
        out.append(f'| {n} | {100*n/total:.1f}% | `{k}` | {exs} |')
    return '\n'.join(out)
def explain(c,label):
    t=top_total(c); comp=c['compiled']; cm=c['classMethod']; nd=c['nestedDef']
    alld=t+cm+nd
    return (f'**{label}**: {t} top-level defs, **{comp} compiled through IR ({100*comp/t:.1f}%)**. '
            f'Beyond the seam: {cm} class-body methods and {nd} nested defs/lambdas, so of all {alld} defs the corpus holds, '
            f'{100*comp/alld:.1f}% go through IR today and {100*cm/alld:.1f}% are class methods the seam never sees.')
std=load([S+'/census_stdlib.out'])
tst=load(sorted(glob.glob(S+'/census_tests_0*.out')))
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
lines.append('Run with the flag forced (`importlib ___irCodegenForce___: true`) in a fresh session so `compiled` means what it says; only modules actually compiled in that session are counted (bootstrap modules loaded at login are not). Scripts: the census imports every top-level module under `src/python/stdlib` (125, a few interactive ones skipped), and separately every module of `scripts/cpython_suite_manifest.txt` in three sessions. Both run in well under a minute.\n')
lines.append('## Corpus 1: the vendored stdlib (125 top-level imports)\n')
lines.append(explain(std[0],'stdlib')+'\n')
lines.append(table(std[0],std[1],top_total(std[0]))+'\n')
lines.append('## Corpus 2: the CPython test modules of the suite manifest\n')
lines.append(f'Importing the {sum(1 for m in tst[2] if m.startswith("test."))+len(tst[3])} manifest modules compiles them AND the stdlib they pull in; {len(tst[3])} failed to import for pre-existing reasons unrelated to IR ({", ".join(tst[3])}).\n')
lines.append(explain(tst[0],'test corpus, everything compiled')+'\n')
tt=top_total(tonly)
lines.append(f'**`test.*` modules alone**: {tt} top-level defs, {tonly["compiled"]} compiled ({100*tonly["compiled"]/tt:.1f}%); {tonly["classMethod"]} class methods (test code is almost entirely TestCase methods), {tonly["nestedDef"]} nested.\n')
lines.append(table(tonly,tex,tt)+'\n')
# per-module ranking (stdlib corpus)
lines.append('## Per-module coverage (stdlib corpus)\n')
lines.append('Top-level defs only. Modules with at least 10 top-level defs, by share compiled.\n')
lines.append('| module | top-level defs | compiled | share | class methods | biggest blocker |\n| --- | ---: | ---: | ---: | ---: | --- |')
rows=[]
for m,c in std[2].items():
    t=top_total(c)
    if t>=10:
        blk=max(((n,k) for k,n in c.items() if k not in STRUCT and k!='compiled'),default=(0,'-'))
        rows.append((c['compiled']/t,t,m,c['compiled'],c['classMethod'],blk))
rows.sort(key=lambda r:(-r[0],-r[1]))
for share,t,m,comp,cm,blk in rows:
    lines.append(f'| {m} | {t} | {comp} | {100*share:.0f}% | {cm} | `{blk[1]}` ({blk[0]}) |')
lines.append('')
open('experiments/ir/CENSUS.md','w').write('\n'.join(lines))
print(explain(std[0],'stdlib')); print(explain(tst[0],'tests all')); print(f'test.* only: {tt} defs, {tonly["compiled"]} compiled, cm {tonly["classMethod"]}')
print(table(tonly,tex,tt)[:1500])
