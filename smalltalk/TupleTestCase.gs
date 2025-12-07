! ------------------- Remove existing behavior from TupleTestCase
removeallmethods TupleTestCase
removeallclassmethods TupleTestCase
! ------------------- Class methods for TupleTestCase
! ------------------- Instance methods for TupleTestCase
category: 'other'
method: TupleTestCase
testJoinedStr

"
  | pyString result |
  
  pyString := 'sequences := ""abcdedfg"".
               print(f""Sequences: {sequences}"")'.
  
  result := ModuleAst evaluate: pyString.
"
%
category: 'other'
method: TupleTestCase
testTuple

	| pyString result |

	pyString := 
't = (1, 2, 3)
x = t[0]
x == 1'.
result := ModuleAst evaluate: pyString.
self assert: result ___value.

	pyString := 
't = (1, 2, 3)
w = t[-1]
w == 3'.
result := ModuleAst evaluate: pyString.
self assert: result ___value.
%
category: 'other'
method: TupleTestCase
testTupleAssignment

"
  | pyString result |
  pyString := 'for a, b in [(1, 2)]: pass'.
  result := ModuleAst evaluate: pyString.
"
	| pyString result |

	pyString := 
'a, b, c = (11, 12, 13)
x = a + b + c
x == 36'.
result := ModuleAst evaluate: pyString.
self assert: result ___value.
%
category: 'other'
method: TupleTestCase
testTupleID

"
  | pyString result sequences seq_id sequence |
	sequences := Dictionary new.
    sequences at: 'seq1' put: 'ATGCATGC'.
    sequences at: 'seq2' put: 'GGTCCGGA'.
	
	result := seq_id id.
	
	result := ModuleAst evaluate: pyString.
"
%
