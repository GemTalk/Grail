output pushnew runStaleChangeStampsTest.out
! file tests/scripts/runStaleChangeStampsTest.gs
!
! The install removes the change stamps runtime compiles left behind (#1971).
!
! Before #1962 and #2108, an environment-0 compile Grail made at runtime -- a
! class's or a module's __transient__ readers, a module's spilled globals, a C
! extension's module class -- went through Behavior >> compileMethod:
! dictionaries:category:environmentId:, which also records a CHANGE STAMP in
! the user's session-method package.  GsPackage >> setStamp:forBehavior:
! forMethod: filed the class under its environment-0 map,
!
!   GrailSessionMethods' GsPackage >> sessionMethods
!     at: aClass put: {methodDict. categoryDict. stampDict. pragmaDict}
!
! with both method dictionaries empty and stampDict at: aClass holding one
! stamp per method.  A commit made the class persistent through that entry
! alone: a session-local ``__main__'' class, or a deployed module's class that
! ``forget'' could not reach.  importlib ___removeStaleChangeStamps___ removes
! them, and the install runs it (rowan/components/doits/postload.st).
!
! Session 1 seeds both kinds through the kernel path the old compiles took,
! and commits:
!
!   stale       a session-local __main__ class and its Python class, a deployed
!               module's class, its metaclass and its Python class (the module
!               is then forgotten)
!   legitimate  every entry the install itself made (Grail-Kernel's session
!               methods); a stamp-only entry for a KERNEL class; a stamp for a
!               user's own Smalltalk class; a user's @smalltalk_class extension
!               of a kernel class (an environment-1 session method)
!
! Session 2 runs the cleanup: it removes exactly the stale entries, keeps every
! legitimate one, and a second run removes nothing.  Then it cleans up.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- seed stale and legitimate stamps, and commit.
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| dir write package map0 map1 before stamp main mod stale probe ext |
dir := importlib grailDir , '/out'.
(GsFile existsOnServer: dir) == true ifFalse: [GsFile createServerDirectory: dir].
dir := dir , '/stale_change_stamps'.
(GsFile existsOnServer: dir) == true ifFalse: [GsFile createServerDirectory: dir].
write := [:name :src | | f |
  f := GsFile openWriteOnServer: dir , '/' , name.
  f nextPutAll: src.
  f close].
write value: 'scs_main.py' value: 'class Conn:
    __transient__ = ["sock"]

result = 1
'.
write value: 'scs_deployed.py' value: 'class DepConn:
    pass

def use():
    return 1
'.
"Association: a kernel class no Grail-Kernel package extends, so the extension
makes the package's environment-1 entry for it."
write value: 'scs_extension.py' value: 'from grail import smalltalk_class

@smalltalk_class(dictionary="Globals", class_name="Association")
class Association:
    __slots__ = ("key", "value")

    def grail_scs_probe(self):
        return "extended"
'.
package := GsPackagePolicy current homeSessionMethods.
map0 := package sessionMethods.
map1 := package _sessionMethodsMapForEnv: 1.
"What the install left, before anything is seeded."
before := Dictionary new.
before at: #env0 put: (IdentityDictionary new).
map0 keysAndValuesDo: [:k :info | (before at: #env0) at: k put: (info at: 1) size].
before at: #env1 put: (IdentitySet withAll: map1 keys).
"The kernel path every pre-#2108 runtime compile took: an environment-0
compile into the class's own method dictionary, stamped in the package."
stamp := [:cls | cls compileMethod: 'grailScsStamp ^ 1'
  dictionaries: GsCurrentSession currentSession symbolList
  category: 'Grail-Transient Attrs' environmentId: 0].
stale := OrderedCollection new.
main := importlib runPath: dir , '/scs_main.py'.
stale add: main class; add: (main dynamicInstVarAt: #Conn).
mod := importlib loadModuleFromPath: dir , '/scs_deployed.py' name: 'scs_deployed'.
stale add: mod class; add: mod class class; add: (mod dynamicInstVarAt: #DepConn).
stale do: [:each | stamp value: each].
"A stamp-only entry for a kernel class: the cleanup keeps kernel classes'
entries whatever they hold."
GsPackagePolicy current setStamp: 'scs' forBehavior: Bag forMethod: #grailScsKernelStamp.
"A user's own Smalltalk class, compiled into at environment 0 as any
Smalltalk tool does: stamped too, and the user's."
probe := Object subclass: 'GrailScsProbe' instVarNames: #() classVars: #()
  classInstVars: #() poolDictionaries: #() inDictionary: UserGlobals options: #().
stamp value: probe.
"A user's @smalltalk_class extension of a kernel class."
importlib runPath: dir , '/scs_extension.py'.
ext := (Association newWithKey: 1 value: 2) @env1:grail_scs_probe.
UserGlobals at: #'Grail_scs_dir' put: dir.
UserGlobals at: #'Grail_scs_before' put: before.
UserGlobals at: #'Grail_scs_stale' put: stale asArray.
UserGlobals at: #'Grail_scs_seed' put: {
  stale allSatisfy: [:each | map0 includesKey: each].
  map0 includesKey: Bag.
  map0 includesKey: probe.
  ext }.
importlib ___forgetCanonicalModule___: 'scs_deployed'.
System commit
%
logout

! ===========================================================================
! Session 2 -- the cleanup removes the stale entries and only those.
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out failures check package map0 map1 before stale seed probe removed again kernelMethods kept preGone |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok == true
    ifTrue: [out nextPutAll: '  ok    '; nextPutAll: label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  '; nextPutAll: label; cr]].
package := GsPackagePolicy current homeSessionMethods.
map0 := package sessionMethods.
map1 := package _sessionMethodsMapForEnv: 1.
before := UserGlobals at: #'Grail_scs_before'.
stale := UserGlobals at: #'Grail_scs_stale'.
seed := UserGlobals at: #'Grail_scs_seed'.
probe := UserGlobals at: #'GrailScsProbe'.
kept := (before at: #env0) keys select: [:k | ((before at: #env0) at: k) > 0].
kernelMethods := kept inject: 0 into: [:n :k | n + ((before at: #env0) at: k)].
[[
  check value: 'seeded: every stale class is in the package' value: (seed at: 1).
  check value: 'seeded: the kernel class''s stamp-only entry' value: (seed at: 2).
  check value: 'seeded: the user Smalltalk class''s stamp' value: (seed at: 3).
  check value: 'seeded: the @smalltalk_class extension answers' value: (seed at: 4) = 'extended'.
  removed := importlib ___removeStaleChangeStamps___.
  "A stone that already held stale entries (one an earlier Grail left) loses
  those too: only entries that held no session method, for no kernel class."
  preGone := (before at: #env0) keys reject: [:k | map0 includesKey: k].
  preGone isEmpty ifFalse: [
    out nextPutAll: '  note  also removed ' , preGone size printString , ' entries already there: '
      , (preGone collect: [:k | k name]) asArray printString; cr].
  check value: 'the cleanup removes the ' , stale size printString , ' stale entries (removed '
      , removed printString , ')'
    value: removed = (stale size + preGone size).
  check value: 'no stale class is left in the package'
    value: (stale anySatisfy: [:each | map0 includesKey: each]) not.
  check value: 'an entry already there that went held no session method and no kernel class'
    value: (preGone allSatisfy: [:k | ((before at: #env0) at: k) = 0
      and: [(Globals at: k theNonMetaClass name otherwise: nil) ~~ k theNonMetaClass]]).
  check value: 'every environment-0 entry holding session methods is kept ('
      , kept size printString , ')'
    value: (kept allSatisfy: [:k | map0 includesKey: k]).
  check value: 'their ' , kernelMethods printString , ' session methods are all kept'
    value: (kept inject: 0 into: [:n :k | n + ((map0 at: k) at: 1) size]) = kernelMethods.
  check value: 'the kernel class''s stamp-only entry is kept' value: (map0 includesKey: Bag).
  check value: 'the user Smalltalk class''s stamp is kept' value: (map0 includesKey: probe).
  check value: 'every environment-1 entry is kept'
    value: ((before at: #env1) allSatisfy: [:k | map1 includesKey: k]).
  check value: 'the @smalltalk_class extension still answers'
    value: ((Association newWithKey: 1 value: 2) @env1:grail_scs_probe) = 'extended'.
  System commitTransaction ifFalse: [failures add: 'the cleanup commit failed'].
  again := importlib ___removeStaleChangeStamps___.
  check value: 'a second run removes nothing (removed ' , again printString , ')' value: again = 0.
] on: AbstractException do: [:e |
  "Reported as a failure, so the ensure block below still cleans up."
  check value: 'raised ' , e class name , ': ' , e messageText asString value: false.
  e return: nil]
] ensure: [
  System abortTransaction.
  "Drop whatever the seed left, whether or not the cleanup ran."
  stale do: [:each | map0 removeKey: each ifAbsent: []].
  map0 removeKey: probe ifAbsent: [].
  (map0 at: Bag ifAbsent: [nil]) ifNotNil: [:info |
    ((before at: #env0) includesKey: Bag)
      ifTrue: [(info at: 3) removeKey: Bag ifAbsent: []]
      ifFalse: [map0 removeKey: Bag]].
  ((before at: #env1) includes: Association)
    ifTrue: [
      #(#grail_scs_probe #'_grail_scs_probe:kw:') do: [:sel |
        (package compiledMethodAt: sel for: Association environmentId: 1) ifNotNil: [
          package removeMethodAt: sel for: Association environmentId: 1]]]
    ifFalse: [map1 removeKey: Association ifAbsent: []].
  UserGlobals removeKey: #'GrailScsProbe' ifAbsent: [].
  #('scs_main.py' 'scs_deployed.py' 'scs_extension.py') do: [:f |
    [GsFile removeServerFile: (UserGlobals at: #'Grail_scs_dir') , '/' , f]
      on: Error do: [:e | e return: nil]].
  #(#'Grail_scs_dir' #'Grail_scs_before' #'Grail_scs_stale' #'Grail_scs_seed') do: [:k |
    UserGlobals removeKey: k ifAbsent: []].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Stale change stamps: all checks passed.'; cr.
    ExitClientError signal: 'stale change stamps passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Stale change stamps FAILED: '; print: failures size;
        nextPutAll: ' check(s):'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'stale change stamps failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
