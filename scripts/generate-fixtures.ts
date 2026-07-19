import { execSync } from 'node:child_process';

const run = (cmd: string) => {
  console.log('$', cmd);
  execSync(cmd, { stdio: 'inherit' });
};

// The Java sources are Latin-1 (e.g. degree signs in Symmetry.java), so compile
// with ISO-8859-1. UTF-8 fails on those bytes. Non-ASCII never reaches fixture output.
run('javac -encoding ISO-8859-1 -sourcepath SukakuExplainer -d scripts/java-driver/out scripts/java-driver/Driver.java');
run('java -cp scripts/java-driver/out Driver random test/fixtures/random.json');
run('java -cp scripts/java-driver/out Driver rate test/fixtures/corpus.txt test/fixtures/puzzles');
// generator fixtures (5 committed seeds)
run('java -cp scripts/java-driver/out Driver generate 1 1.0 1.2 test/fixtures/generator/easy-s1.json');
run('java -cp scripts/java-driver/out Driver generate 2 1.0 1.2 test/fixtures/generator/easy-s2.json');
run('java -cp scripts/java-driver/out Driver generate 3 1.0 1.2 test/fixtures/generator/easy-s3.json');
run('java -cp scripts/java-driver/out Driver generate 1 1.3 1.6 test/fixtures/generator/medium-s1.json');
run('java -cp scripts/java-driver/out Driver generate 1 1.7 2.5 test/fixtures/generator/hard-s1.json');
