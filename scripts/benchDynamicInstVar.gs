! file scripts/benchDynamicInstVar.gs
! Microbenchmark: direct instance variable accessors (Association>>value[:])
! vs reflective access (Object>>dynamicInstVarAt:[put:])
! vs SymbolDictionary access (at:[put:]).

! source .setenv && topaz -l < scripts/benchDynamicInstVar.gs

iferr 1 stk
iferr 2 exit 1
login
level 0
printit
| assoc dict n trials dr dy ds wr wy ws minOf fmt out |
assoc := Association newWithKey: #foo value: 42.
dict := SymbolDictionary new.
dict at: #value put: 42.
n := 10000000.
trials := 5.
dr := OrderedCollection new.
dy := OrderedCollection new.
ds := OrderedCollection new.
wr := OrderedCollection new.
wy := OrderedCollection new.
ws := OrderedCollection new.

"Warm up so the first trial isn't skewed by code-cache / GC effects."
10000 timesRepeat: [
    assoc value.
    assoc dynamicInstVarAt: #value.
    dict at: #value
].

trials timesRepeat: [
    dr add: (System millisecondsToRun: [ n timesRepeat: [ assoc value ] ]).
    dy add: (System millisecondsToRun: [ n timesRepeat: [ assoc dynamicInstVarAt: #value ] ]).
    ds add: (System millisecondsToRun: [ n timesRepeat: [ dict at: #value ] ]).
    wr add: (System millisecondsToRun: [ n timesRepeat: [ assoc value: 42 ] ]).
    wy add: (System millisecondsToRun: [ n timesRepeat: [ assoc dynamicInstVarAt: #value put: 42 ] ]).
    ws add: (System millisecondsToRun: [ n timesRepeat: [ dict at: #value put: 42 ] ]).
].

minOf := [:coll | coll inject: coll first into: [:m :v | v < m ifTrue: [v] ifFalse: [m]]].
fmt := [:direct :other |
    direct = 0
        ifTrue: ['inf']
        ifFalse: [(other asFloat / direct asFloat) printString]].

out := String new.
out
    add: 'Iterations per trial: ', n printString,
        '   Trials: ', trials printString; lf;
    add: '  Read  direct     (#value)                trials=', dr printString,
        '  min=', (minOf value: dr) printString, ' ms'; lf;
    add: '  Read  dynamic    (dynamicInstVarAt:)     trials=', dy printString,
        '  min=', (minOf value: dy) printString, ' ms'; lf;
    add: '  Read  symbolDict (at:)                   trials=', ds printString,
        '  min=', (minOf value: ds) printString, ' ms'; lf;
    add: '  Write direct     (#value:)               trials=', wr printString,
        '  min=', (minOf value: wr) printString, ' ms'; lf;
    add: '  Write dynamic    (dynamicInstVarAt:put:) trials=', wy printString,
        '  min=', (minOf value: wy) printString, ' ms'; lf;
    add: '  Write symbolDict (at:put:)               trials=', ws printString,
        '  min=', (minOf value: ws) printString, ' ms'; lf;
    lf;
    add: 'Ratios vs direct (best-of-', trials printString, '):'; lf;
    add: '  Read  dynamic    : ', (fmt value: (minOf value: dr) value: (minOf value: dy)), 'x'; lf;
    add: '  Read  symbolDict : ', (fmt value: (minOf value: dr) value: (minOf value: ds)), 'x'; lf;
    add: '  Write dynamic    : ', (fmt value: (minOf value: wr) value: (minOf value: wy)), 'x'; lf;
    add: '  Write symbolDict : ', (fmt value: (minOf value: wr) value: (minOf value: ws)), 'x'; lf.
out
%
logout
exit 0

! Iterations per trial: 10000000   Trials: 5
!   Read  direct     (#value)                trials=anOrderedCollection( 85, 76, 78, 75, 74)  min=74 ms
!   Read  dynamic    (dynamicInstVarAt:)     trials=anOrderedCollection( 101, 111, 112, 111, 109)  min=101 ms
!   Read  symbolDict (at:)                   trials=anOrderedCollection( 203, 201, 203, 201, 204)  min=201 ms
!   Write direct     (#value:)               trials=anOrderedCollection( 84, 100, 107, 101, 96)  min=84 ms
!   Write dynamic    (dynamicInstVarAt:put:) trials=anOrderedCollection( 118, 122, 122, 121, 121)  min=118 ms
!   Write symbolDict (at:put:)               trials=anOrderedCollection( 628, 633, 629, 631, 633)  min=628 ms
!
! Ratios vs direct (best-of-5):
!   Read  dynamic    : 1.36x
!   Read  symbolDict : 2.72x
!   Write dynamic    : 1.40x
!   Write symbolDict : 7.48x
