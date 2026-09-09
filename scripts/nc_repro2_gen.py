#!/usr/bin/env python3
"""nc_repro v2 -- close the gaps v1 left open.

v1 (400 small methods on ONE class, env 0) ran 1.8M compile+call cycles on real
Linux x86_64 CI without faulting.  Four differences from what Grail actually
does, in rough order of suspicion:

  1. ARENA GROWTH.  v1's working set is tiny, so the code_methods arena
     probably never grows past its first allocation -- and mapping/protecting
     NEW pages is the prime suspect for a page left non-executable.  v2 emits
     many classes x many LARGE methods to force the arena to grow for real.
  2. ENVIRONMENT 1.  Grail's methods are env-1 session methods, a different
     install path.  v2 compiles into env 1.
  3. METHOD SIZE.  Grail's generated methods are big; v1's were four lines.
  4. CLASS COUNT.  Grail makes a class per Python module; v1 reused one.
"""
import sys

STONE = sys.argv[1] if len(sys.argv) > 1 else 'gs64stone'
CLASSES = int(sys.argv[2]) if len(sys.argv) > 2 else 150
METHODS = int(sys.argv[3]) if len(sys.argv) > 3 else 60
STMTS = int(sys.argv[4]) if len(sys.argv) > 4 else 60
ENVID = sys.argv[5] if len(sys.argv) > 5 else '1'

o = []
o.append('! nc_repro v2: force code_methods arena GROWTH, env %s, large methods.' % ENVID)
o.append('! Hunting SIGSEGV in code_methods, si_code 2 / err 0x15 (instruction')
o.append('! fetch on a present-but-not-executable page).  No Grail.')
o.append('set user SystemUser pass swordfish gems %s' % STONE)
o.append('login')
o.append('iferr 1 stack')

for c in range(CLASSES):
    cls = 'NCG%d' % c
    o.append('run')
    o.append("Object subclass: '%s'" % cls)
    o.append('  instVarNames: #() classVars: #() classInstVars: #()')
    o.append('  poolDictionaries: {} inDictionary: UserGlobals.')
    o.append('^ true')
    o.append('%')
    o.append('run')
    o.append('| c sum |')
    o.append('c := UserGlobals at: #%s.' % cls)
    o.append('1 to: %d do: [:i |' % METHODS)
    o.append('  | sel src |')
    o.append("  sel := ('big' , i printString) asSymbol.")
    o.append("  src := sel , '")
    o.append('  | a b |')
    o.append('  a := ' + "' , i printString , '" + '.')
    o.append('  b := 0.')
    # A long straight-line body: more bytecode => more native code per method,
    # so the arena grows quickly rather than reusing one page forever.
    for s in range(STMTS):
        o.append('  b := b + a - %d + %d.' % (s, s))
    o.append("  ^ b'.")
    o.append('  c compileMethod: src')
    o.append('    dictionaries: System myUserProfile symbolList')
    o.append("    category: 'churn'")
    o.append('    environmentId: %s' % ENVID)
    o.append('    methodDictEnvId: %s.' % ENVID)
    # Execute IMMEDIATELY: first entry is into just-generated native code.
    o.append('  sum := c new perform: sel env: %s.' % ENVID)
    o.append("  sum isNil ifTrue: [nil error: 'nil result']].")
    o.append('^ true')
    o.append('%')
    if c % 25 == 24:
        o.append('run')
        o.append('System commit.')
        o.append("GsFile stdout nextPutAll: 'class %d done'; lf." % (c + 1))
        o.append('^ true')
        o.append('%')

# Second phase: re-enter every method that already exists, after the arena has
# grown.  If growth left an older page mis-protected, this is where it shows.
o.append('run')
o.append('| n |')
o.append('n := 0.')
o.append('0 to: %d do: [:ci |' % (CLASSES - 1))
o.append("  | c | c := UserGlobals at: ('NCG' , ci printString) asSymbol.")
o.append('  1 to: %d do: [:i |' % METHODS)
o.append("    (c new perform: ('big' , i printString) asSymbol env: %s) isNil" % ENVID)
o.append("      ifTrue: [nil error: 'nil on re-entry'].")
o.append('    n := n + 1]].')
o.append("GsFile stdout nextPutAll: 'RE-ENTERED ' , n printString; lf.")
o.append('^ true')
o.append('%')
o.append('logout')
o.append('exit')

sys.stdout.write('\n'.join(o) + '\n')
