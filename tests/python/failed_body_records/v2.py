# Driven by FailedBodyRecordsTestCase: the revision whose body fails after
# recording a different signature for f.  Its records must not be written.

def f(a, b=1, c=2):
    return a + b + c

raise ValueError('the body of failed_body_records v2 fails here')
