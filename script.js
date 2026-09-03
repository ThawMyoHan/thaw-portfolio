const revealItems = document.querySelectorAll('.reveal');
const backdrops = document.querySelectorAll('.backdrop');
const themeToggle = document.querySelector('.theme-toggle');
const topbar = document.querySelector('.topbar');
const projectModal = document.querySelector('.project-modal');
const projectModalTitle = document.getElementById('project-modal-title');
const projectModalKicker = document.getElementById('project-modal-kicker');
const projectModalSummary = document.getElementById('project-modal-summary');
const projectModalPath = document.getElementById('project-modal-path');
const projectModalLabel = document.getElementById('project-modal-label');
const projectModalCode = document.getElementById('project-modal-code');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const splitButtonGroups = document.querySelectorAll('.hero-actions, .contact-actions, .project-links');
const projectsSection = document.getElementById('projects');
const projectCards = [...document.querySelectorAll('#projects .project-card')];

let previousProjectScrollY = window.scrollY;
let projectsWereInView = false;
const THEME_TRANSITION_MS = 920;

let scrollRafId = 0;
let topbarIdleTimerId = 0;
let themeTransitionTimerId = 0;
let themeOverlayRafId = 0;

const projectContent = {
  dungeon: {
  title: 'Dungeon Concurrency Lab',
  notesLabel: 'Project notes',
  sourcePath: 'D:\\CECS 326\\Lab02\\cecs-326-sp26-03-lab-02-semaphores-ThawMyoHan\\game.c',
  notesPath: 'D:\\CECS 326\\Lab02\\cecs-326-sp26-03-lab-02-semaphores-ThawMyoHan\\README.md',
  sourceSummary: 'A systems programming lab built around shared memory, processes, signals, and semaphores.',
  notesSummary: 'Course notes and assignment guidance for the dungeon game workflow.',
    sourceCode: String.raw`#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/wait.h>

#include "dungeon_info.h"

int main(void)
{
    /* remove leftover shared memory from previous crashed run */
    shm_unlink(dungeon_shm_name);

    /* this is the shared memory segment */
    int fd = shm_open(dungeon_shm_name, O_CREAT | O_RDWR, 0666);
    if (fd == -1) {perror("game: shm_open"); return 1;}

    /* ftruncate time */
    /* determine the size of the segment to hold exactly ONE Dungeon struct*/
    if (ftruncate(fd, sizeof(struct Dungeon)) == -1) {
        perror("game: ftruncate"); return 1;
    }

    /* it's mmap time */
    /* this maps the segment into this process's address space */
    struct Dungeon *dungeon =mmap(NULL, sizeof(struct Dungeon), PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (dungeon == MAP_FAILED) {perror("game: mmap"); return 1;}

    dungeon->running = true;

    printf("Created shared memory: %s\n", dungeon_shm_name);
    printf("Dungeon size: %zu bytes\n", sizeof(struct Dungeon));
    printf("Press enter to end game.\n");
    getchar();

    dungeon->running = false;

    /* memset */
    /* zero out the struct before any child process attaches */
    memset(dungeon, 0, sizeof(struct Dungeon));

    /* TODO: fork and exec character processes */
    /* TODO: call RunDungeons */

    /* unmapping and deleting shared memory when exiting */
    mumap(dungeon, sizeof(struct Dungeon));
    shm_unlink(dungeon_shm_name);

    return 0;
}`,
    notesCode: String.raw`CECS 326 Lab 2 notes

  This project focuses on concurrent processing, shared memory, signals, and semaphores.
  The assignment launches multiple processes, shares a Dungeon struct across them, and cleans up resources at the end of the run.`,

  /*
  ## Shared Memory Overview

This project will require you to be familiar with [shared memory](https://man7.org/linux/man-pages/man7/shm_overview.7.html) on Posix systems. It will also require you to handle [Signals](https://man7.org/linux/man-pages/man7/signal.7.html) properly. Since all of this will be done in the C-language, I highly recommend that you brush up on your C practices.

For the purposes of this assignment, only store the **Dungeon** struct in shared memory. Not any of the other structs. If you set it up properly, adjusting one value from one process in shared memory will adjust it for all processes in shared memory.

## Semaphore Overview

After your characters have successfully arrived at the end of the dungeon,  they will have one final challenge. The treasure room door must be held open by two party members in order to let the Rogue in to get the treasure! It doesn't matter which party member holds which lever, only that both levers are held down by two separate party members long enough for the Rogue to get all of the treasure. The last four points will be for releasing the [semaphores](https://man7.org/linux/man-pages/man7/sem_overview.7.html) after the Rogue leaves the treasure room. Appropriate methods will be declared, and the names of the [semaphores](https://man7.org/linux/man-pages/man7/sem_overview.7.html) will be given in the \\`dungeon_info.h\\` file. We will be using the Named Semaphores defined in [sem_overview](https://man7.org/linux/man-pages/man7/sem_overview.7.html). Be sure to read the definitions for [sem_post](https://man7.org/linux/man-pages/man3/sem_post.3.html) and [sem_wait](https://man7.org/linux/man-pages/man3/sem_wait.3.html), remembering that in this case, "holding" the door for the Rogue here would be preventing the dungeon from accessing the room while the Rogue gets the treasure. This is the final part of this assignment that is graded, so make sure everything else works first before tackling this!

The dungeon will send a new signal, defined in \\`dungeon_settings.h\\` as \\`SEMAPHORE_SIGNAL\\`. Make sure that your classes can handle it without crashing! After your Rogue gets all four letters from the "treasure" field, copy them into the "spoils" field of the Dungeon, and release the semaphores. Note: The treasure field will only give one character at a time, and it will pause between adding additional characters. It will also not be null terminated, so make sure you plan around tackling that problem!

Each correct treasure character is worth \\`55\\` points for a maximum of \\`220\\` points. Getting all four characters also demonstrates that you have handled your semaphores correctly for full credit on this section.

Once the Rogue has gotten all of the treasure, it is up to you how you want to handle re-opening the semaphores. Do you want the Wizard and Barbarian to wait until the Rogue has four characters in the \\`spoils\\` field, and then immediately release the door? Do you want the Rogue to send a signal to the Wizard and Barbarian to release the door? This part is up to you to figure out. By now, if you've gotten this far, you should have at least one or two ideas of how to tackle this.

Note: Your semaphores should be created before you call RunDungeon. Also, the \\`treasure\\` and \\`spoils\\` fields will be initialized to null terminators before their values are used. This can be useful to note.

# Assignment Details

## Required Reading

Please read at a *MINIMUM* the following pages. You don't need to be meticulous about your reading, but at a minimum read the information that seems important, and be familiar with the pages. Then, answer the following questions. These questions are not graded, but knowing the answers to them will help you immensely when you actually start to code this assignment:
1. [shared memory](https://man7.org/linux/man-pages/man7/shm_overview.7.html) (and its related pages, at least the first three in the description.

2. [fork()](https://man7.org/linux/man-pages/man2/fork.2.html)

3. [exec](https://man7.org/linux/man-pages/man3/exec.3.html) (This has many different functions that do effectively the same thing, but through different means. Pick your favorite.)

4. [sigaction](https://man7.org/linux/man-pages/man2/sigaction.2.html) (You may choose to use [signal](https://man7.org/linux/man-pages/man7/signal.7.html) instead, but I highly recommend the prior one.)

5. [Makefile](https://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/) (You are only required to make a Makefile that uses what you learn up to the first Makefile iteration, but it is worth a read to go a bit further. You may either use multiple gcc compile commands in your first make rule, or you may create multiple make rules that run by calling your first make rule. [More on that here](https://makefiletutorial.com/#targets).)

6. [Semaphores](https://man7.org/linux/man-pages/man7/sem_overview.7.html) (Be very familiar with what posting versus waiting does.)

### questions you should answer:
* Q1. In what order should you perform the actions to create [shared memory](https://man7.org/linux/man-pages/man7/shm_overview.7.html)? (HINT: A minimum of three functions must be used the first time you create shared memory.)

* Q2. What is the return type of mmap, and what can you do with it? (If you are unfamiliar with C/C++, you might need to [do some personal research](https://en.cppreference.com/w/c) in order to understand this data type.)

* Q3. What does [fork()](https://man7.org/linux/man-pages/man2/fork.2.html) return, and how can that information be used?

* Q4. If [exec](https://man7.org/linux/man-pages/man3/exec.3.html) works as intended, what happens to the process that calls it?

* Q5. Do all three functions for shared memory need to be called in every single process after the first? If yes, why? If no, which ones are needed, and why would you not need to call all of them?

* Q6. What does a [struct](https://en.cppreference.com/w/c/language/struct) look like in memory, and if I store a struct in shared memory, how do I access its various fields?

* Q7. How do I determine the size of a struct in bytes?

## Caesar Cipher

If you want to know a brief history of the Caesar Cipher, feel free to read the [Wikipedia page](https://en.wikipedia.org/wiki/Caesar_cipher) for a summary. The wikipedia page also offers some formulas and examples that might help reinforce your understanding.

In C, characters are represented as chars, which are typically one byte of memory. They also have a numerical value, such as \\`65\\` for \\`A\\`, \\`90\\` for \\`Z\\`, \\`97\\` for \\`a\\`, and \\`122\\` for \\`z\\`. A full list of values can be seen here:
![ASCII Table](https://www.asciitable.com/asciifull.gif "An ASCII Table").

We can utilize this in order to both encrypt and decrypt information using a Caesar Cipher. While Caesar Ciphers are not cryptographically secure, they are a nice introduction to the idea of data obfuscation. For the purposes of this assignment, the **Barrier** struct contains a field called **spell**. This is a char array of a size determined in the \\`dungeon_settings.h\\` file. Every alphabetical character that is put into the **Barrier**'s **spell** field will use the first character in the array as the shift value. So for example, if the first character were \\`T\\`, it would represent a shift of \\`84\\`.

Notice that in that example the value of \\`84 > 26\\`, and thus the shift would be greater than the number of characters in the alphabet. You will have to "roll" the numbers using modulo in order to keep them within the same alphabet. Capitalization will remain consistent. If a character in the **spell** field is capitalized, it will also be capitalized in the final answer. If it is lower case, it will be lower case in the final answer. Punctuation and spaces do not need to be modified at all.

## Binary Search

For a more detailed read on Binary Search, feel free to peruse the [Wikipedia article](https://en.wikipedia.org/wiki/Binary_search_algorithm).

A Binary Search in Computer Science is an algorithm that splits a list in half, and then checks if the desired element is above or below the current position. It then splits that list in half, and repeats the previous steps until the element is found. While this is usually used to traverse an array to find a list element, this formula can also be utilized to find a floating point value. This is how we will utilize it.

Our Dungeon will pick a random value between \\`0\\` and the value **MAX_PICK_ANGLE** defined in \\`dungeon_settings.h\\`. It is then up to our Rogue to guess that value. To do this, start by picking a value halfway between \\`0\\` and **MAX_PICK_ANGLE**, and put that in the **Rogue**'s **pick** field. The dungeon will put a value in **Trap**'s **direction** field to indicate whether the position is above or below the current **pick** value. (HINT: I recommend setting the value in **direction** to something like \\`t\\` after modifying your **pick** value so that you can tell when the value has changed. Otherwise it can be difficult to tell if you need to adjust your position or not.)

When the pick is within the threshold defined by **LOCK_THRESHOLD** in \\`dungeon_settings.h\\`, the dungeon will place a \\`-\\` character in **direction**. Use this information to tell the Rogue to stop searching for new values.

## Timeline

While adherence to this timeline is not graded, you will be on-track if you meet or beat these deadlines. If you have not finished one of these deadlines by the time given, please come visit me in my office hours, or at least send me an e-mail if you're having trouble understanding the assignment. Remember: I'm here to help. Be curious, and don't wait until the last second to do this assignment. Trust me on this.

Week 1-2: Create your makefile, and have your \\`game\\`, \\`barbarian\\`, \\`wizard\\`, and \\`rogue\\` processes able to be compiled. They don't need to be finished yet, but they need to exist in a runnable state. The Dungeon will not run properly unless three separate processes have been started, and are running by the time the Dungeon is started.

Week 3-4: All of your processes should be able to access [shared memory](https://man7.org/linux/man-pages/man7/shm_overview.7.html) and interpret the data that matters to them. Ensure that you're using [fork](https://man7.org/linux/man-pages/man2/fork.2.html) and [exec](https://man7.org/linux/man-pages/man3/exec.3.html) properly. Even if all of your processes don't fully work yet, they should all be runnable, and they should exist until they are terminated.

Week 5-6: Your \\`barbarian\\` process should be 100% functional, and your \\`wizard\\` and \\`rogue\\` processes should work at least to some degree. Every process should be able to receive a signal without crashing, and every process should be able to do something with shared memory when they receive a signal. Please also ensure that you're cleaning up after yourself by this point. Clean up your shared memory, terminate your processes properly, etc. A field, \\`running\\` exists in the dungeon to help with this. If \\`dungeon->running == false\\`, all processes should be terminated. (I recommend including in all of your while loops a condition to exit if this \\`running\\` field becomes false at any point.)

Week 7-8: Every process should be successful in running. If you're not getting a near 100% success rate, please see me in my office hours to try and figure out what might be going wrong. A failure once in a blue moon is nothing to worry about. Finally, your semaphores should be set up by now.

## Grading scale:

### Be aware!!
An automatic \\`zero\\` will apply to any repository with the following:
- Your written code is not commented.
- You did not include a makefile
- There are no commits to GitHub
- Your source code is is archived (\\`.zip\\`, \\`.rar\\`, or similar) or any attempt is made to obfuscate or hide code
- or there are no source files to run

Points | Requirement
------- | -----------
20     | Your code compiles and runs successfully, and you have followed the rules.
30     | You successfully created and managed shared memory
20     | All of your processes run concurrently, and they can all access shared memory.
20     | Your processes do not crash upon receiving signals, or through regular use.
10     | \\`1\\` point for every successful run of the dungeon. I will run each character twice, followed by four random runs for up to \\`10\\` points.
260    | \\`55\\` points for each correct treasure character obtained by the Rogue, for up to \\`220\\` points. Then, you must release your semaphores correctly to receive the last \\`40\\` points.

Partial credit may be given based on degree of success for any of the above, and additional points may be deducted in rare cases of completely disregarding the point of the directions. (Bear in mind, it's okay to experiment and have odd solutions, but if you do something along the lines of just guessing random phrases for the Wizard, for example, or by using length to calculate which phrase it is, this is grounds for points being lost. As long as your solution keeps within the spirit of the assignment, you shouldn't have to worry about this.)

## A quick C refresher:

Pointers - A pointer is only an address, on its own it does not contain any information. It must be given memory in some way. This is most often seen with [malloc](https://man7.org/linux/man-pages/man3/free.3.html), or its variations. Until initialized, pointers tend to seg fault when used. The information at the end of pointers is accessed with one of the following:
 - \\`(*myPointer)\\`
 - \\`myPointer[index]\\`
 - \\`myPointer->someValue\\` (this is mostly seen with structs)

Arrays - Arrays in C/C++ exist in two forms. Either pre-allocated, or dynamic. You may reassign individual values within pre-allocated arrays, but if you try to assign directly to a pre-allocated array, your program will in the best case either not compile or crash, and worst case will perform undefined behavior. Dynamic memory can be reassigned to, but you risk memory leaks if you do not [free](https://man7.org/linux/man-pages/man3/free.3p.html) your memory.

Pre-allocated arrays:
 - \\`int myArr[10];\\`

Dynamically allocated arrays:
 - \\`int *myArr = malloc(sizeof(int) * 10);\\`

[printf](https://man7.org/linux/man-pages/man3/printf.3.html) - This prints to the terminal by default. It uses string substitutions with %'s to format your string. It will look something like this:

\\`printf("my string: %s, my int: %d, my address: %p, my char: %c", someString, someInt, somePointer, someChar);\\`

[C-style strings](https://man7.org/linux/man-pages/man3/string.3.html) - C is a more archaic language, and lacks some features that you might be used to, including strings. In C, a string is a \\`char*\\`, or \\`char[]\\` that ends with a literal \\`\\0\\` character (null-terminator). When printing, if you manually created a \\`char[]\\`, and funky stuff happens or you segfault after trying to print using that string, make sure that the very last element is a null-terminator \\`\\0\\` character, otherwise your program won't know where the string ends, and might even traverse your entire computer's memory looking for an end.

## Recommendations:
 - If your \\`Rogue\\` is for some reason not modifying shared memory properly, double-check that you've terminated the process, and that it hasn't crashed. Both can lead to perplexing errors.
 - If the dungeon is printing `_` characters for your wizard's spell, that means that you used an invalid character. Check your math on your caesar Cipher, and make sure that you're wrapping properly and ignoring punctuation correctly.
 - For the Rogue, try setting **direction** to \\`t\\` or a similar unused character every time you set the value in **pick**, and then do not do anything while the character is still \\`t\\`.
 - If you find your program handling one signal fine, and then crashing, try setting up more information in your [sigaction](https://man7.org/linux/man-pages/man2/sigaction.2.html) before registering your signal handling. You might need to set the restart flag.
 - Do not wait to start working. Sleep clears your mental state and allows you to look at your code with a fresh mind. You will likely need to refactor this assignment two or three times at least. This takes time, and is best not left until the day before the assignment is due.
 - Remember, commit early, commit often. The deadline can sneak up on you. It's better to have almost everything turned in when the deadline passes than nothing turned in. Just do a commit every time you finish for the day and push it to GitHub and you won't have to worry about this.
 - Be good friends with sleep and usleep. These functions force your process to relinquish some time, and this might sometimes be necessary to play nicely with other processes, including the dungeon! Remember: If you're using multiple processes, and you want to let another one run, just do a quick usleep.

## Some miscellaneous useful information:
### Helpful Linux/Unix terminal commands:
- [touch](https://man7.org/linux/man-pages/man1/touch.1.html) - to create your files
- [htop](https://man7.org/linux/man-pages/man1/htop.1.html) - for if you want to see if any errant processes are still running
- [kill](https://man7.org/linux/man-pages/man1/kill.1.html) - for if you find an errant process running
### Useful information if you get stuck:
- In order to compile on Unix/Linux machines, you may need to specify some compiler flags. Specifically -lrt needs to be near/at the end of your compile commands for working with shared memory.
- It's worth checking that you have included any headers that you need at the top of your source files. If you find yourself being told that you are using functions implicitly without defining them, this is probably the culprit.
- Order of function definitions matters in C. You can get around this, however, by *declaring* functions before using them. [More on that here](https://en.cppreference.com/w/c/language/functions). This is where a header file might come in handy.
- If the implementation part of this seems a bit general, and open to interpretation, that's because it is. As computer scientists and engineers, I expect you to have some level of problem solving skills and the ability to research problems to find solutions. While I have certainly given you plenty of links to get you started, this is far from all of the information you will need to know in order to get a 100% in this lab. Be curious, ask questions, hypothesize and test. That's the *science* part of Computer Science.

## Deliverables

I will require the following items for grading:

* Your \\`*.c\\` source code files
* Your *makefile*
* At least one screenshot of your executed code, in \\`*.png\\` or \\`*.jpg\\` format

Submit your files through your git repository. Your submission must follow the following rules, else *I will not grade it and you will receive a zero for the submission*:

* Do not use compression on your files
* Make sure that all significant code is *commented* with your own explanations`
*/
  },
  sorting: {
  title: 'Generic Sorting Showcase',
  notesLabel: 'Console output',
  sourcePath: 'D:\\CECS 342\\Assignment6\\generic_sorting.cs',
  notesPath: 'D:\\CECS 342\\Assignment6\\output_cs.txt',
  sourceSummary: 'A C# assignment that sorts numbers and people using generic comparisons.',
  notesSummary: 'Sample output from running the sorting program.',
    sourceCode: String.raw`using System;
using System.Collections.Generic;
using System.Globalization;

// Make a simple Person type with Name and Age.
public record Person(string Name, int Age);

// Main class for running the assignment.
public static class Program
{
    // Helper function to print a list of doubles.
    private static void PrintDoubles(IReadOnlyList<double> values)
    {
        // Print opening bracket.
        Console.Write("[");

        // Loop through each number.
        for (int i = 0; i < values.Count; i++)
        {
            // Print number with 2 decimal places.
            Console.Write(values[i].ToString("F2", CultureInfo.InvariantCulture));

            // Print comma between values.
            if (i + 1 < values.Count)
            {
                Console.Write(", ");
            }
        }

        // Print closing bracket.
        Console.WriteLine("]");
    }

    // Helper function to print a list of people.
    private static void PrintPeople(IReadOnlyList<Person> people)
    {
        // Print opening bracket.
        Console.Write("[");

        for (int i = 0; i < people.Count; i++)
        {
            // Print "Name, Age".
            Console.Write($"{people[i].Name}, {people[i].Age}");

            // Print separator between people.
            if (i + 1 < people.Count)
            {
                Console.Write("; ");
            }
        }

        // Print closing bracket.
        Console.WriteLine("]");
    }

    public static void Main()
    {
        // Create the original number list.
        var numbers = new List<double>
        {
            645.41, 37.59, 76.41, 5.31, -34.23, 1.11,
            1.10, 23.46, 635.47, -876.32, 467.83, 62.25
        };`,
    notesCode: String.raw`CECS 342 Assignment 6 output

  The program sorts a list of numbers in ascending order and sorts a list of people by name and age.

  This shows the final formatted output from the console run.`,
  },
  valentine: {
  title: 'Valentine Site',
  notesLabel: 'Source files',
  sourcePath: 'D:\\CECS 229\\valentine\\index.html',
  notesPath: 'D:\\CECS 229\\valentine\\script.js',
  sourceSummary: 'A small frontend project with HTML, CSS, and JavaScript interaction.',
  notesSummary: 'The supporting files that make the playful Valentine interaction work.',
    sourceCode: String.raw`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>will you be my valentine?</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <!-- Gif -->
        <img src="\\CECS 229\\valentine\\images\\ghostface-nod.gif" id="nodding" alt="ghostface-nodding"/>
        <!-- Question -->
        <h1 id="message">
        Will you be my Valentine? (˶ᵔ ᵕ ᵔ˶)
        </h1>
    </div>`,
    notesCode: String.raw`Valentine site source notes

  This frontend project combines HTML, CSS, and JavaScript to make a playful interaction.

  The UI changes as the user clicks the buttons, including image swapping, text changes, and button scaling.`,
  }
};

// Clamp keeps scroll math predictable when values drift outside the range we want.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function openProjectModal(projectKey, viewKey) {
  if (!projectModal) {
    return;
  }

  const project = projectContent[projectKey];

  if (!project) {
    return;
  }

  const isSourceView = viewKey === 'source';

  projectModalTitle.textContent = project.title;
  projectModalKicker.textContent = isSourceView ? 'Source code' : project.notesLabel;
  projectModalSummary.textContent = isSourceView ? project.sourceSummary : project.notesSummary;
  projectModalPath.textContent = isSourceView ? project.sourcePath : project.notesPath;
  projectModalLabel.textContent = isSourceView ? 'Source excerpt' : 'Notes excerpt';
  projectModalCode.textContent = isSourceView ? project.sourceCode : project.notesCode;

  projectModal.hidden = false;
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  if (!projectModal) {
    return;
  }

  projectModal.hidden = true;
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Read the current theme from the document, falling back to light mode.
function getTheme() {
  return document.documentElement.dataset.theme || 'light';
}

// Apply the chosen theme and keep the toggle label in sync.
function applyTheme(theme, options = {}) {
  const { animate = true, persist = true } = options;
  const previousTheme = getTheme();
  const isThemeChange = previousTheme !== theme;

  if (animate && isThemeChange && !prefersReducedMotion) {
    window.cancelAnimationFrame(themeOverlayRafId);
    clearTimeout(themeTransitionTimerId);
    document.documentElement.classList.remove(
      'theme-transitioning',
      'theme-fade-overlay-on',
      'theme-fade-from-light',
      'theme-fade-from-dark'
    );

    document.documentElement.classList.add('theme-transitioning', `theme-fade-from-${previousTheme}`, 'theme-fade-overlay-on');

    // Let the overlay appear first, then fade it out for a smooth crossfade.
    themeOverlayRafId = window.requestAnimationFrame(() => {
      themeOverlayRafId = window.requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-fade-overlay-on');
      });
    });

    themeTransitionTimerId = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning', 'theme-fade-from-light', 'theme-fade-from-dark');
    }, THEME_TRANSITION_MS + 140);
  } else if (!isThemeChange) {
    document.documentElement.classList.remove('theme-fade-overlay-on', 'theme-fade-from-light', 'theme-fade-from-dark');
  } else {
    document.documentElement.classList.add('theme-transitioning');

    themeTransitionTimerId = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, THEME_TRANSITION_MS);
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (themeToggle) {
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.textContent = isDark ? 'Dark' : 'Light';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  if (persist) {
    localStorage.setItem('portfolio-theme', theme);
  }
}

// Start with the saved theme when available, otherwise follow the system setting.
function initializeTheme() {
  const storedTheme = localStorage.getItem('portfolio-theme');
  const theme = storedTheme || (prefersDarkQuery.matches ? 'dark' : 'light');
  applyTheme(theme, { animate: false, persist: false });
}

// Fade and brighten content based on its position in the viewport.
function updateRevealMotion() {
  if (prefersReducedMotion) {
    revealItems.forEach((item) => {
      item.classList.add('is-visible');
      item.style.opacity = '1';
      item.style.transform = 'none';
    });
    return;
  }

  const viewportHeight = window.innerHeight;
  const viewportCenter = viewportHeight / 2;
  const activeTop = viewportHeight * 0.22;
  const activeBottom = viewportHeight * 0.78;
  const preheatDistance = viewportHeight * 0.16;
  const isAtPageBottom = window.scrollY + viewportHeight >= document.documentElement.scrollHeight - 8;

  revealItems.forEach((item) => {
    if (isAtPageBottom && item.classList.contains('contact')) {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0) scale(1)';
      item.style.filter = 'brightness(1) saturate(1)';
      return;
    }

    const rect = item.getBoundingClientRect();

    // Keep a section fully readable whenever it overlaps the active viewport band.
    if (rect.bottom > activeTop && rect.top < activeBottom) {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0) scale(1)';
      item.style.filter = 'brightness(1) saturate(1)';
      return;
    }

    const itemCenter = rect.top + rect.height / 2;
    const distanceFromCenter = Math.abs(itemCenter - viewportCenter);
    const fadeDistance = viewportHeight * 0.58;
    const focus = clamp(1 - distanceFromCenter / fadeDistance, 0, 1);

    // Distance from this section to the active viewport band.
    const distanceToBand = rect.bottom <= activeTop
      ? activeTop - rect.bottom
      : rect.top - activeBottom;
    const approach = clamp(1 - distanceToBand / preheatDistance, 0, 1);

    // Keep sections readable around entry/exit, but still let them fade farther away.
    const opacity = 0.2 + approach * 0.38 + focus * 0.32;
    const translateY = (1 - approach) * 22 + (1 - focus) * 10;
    const scale = 0.975 + approach * 0.015 + focus * 0.01;
    const brightness = 0.78 + approach * 0.14 + focus * 0.1;
    const saturate = 0.86 + approach * 0.12 + focus * 0.1;

    item.style.opacity = opacity.toFixed(3);
    item.style.transform = `translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`;
    item.style.filter = `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
  });
}

// Animate project cards when the Projects section enters the viewport.
function initializeProjectCardAnimations() {
  if (!projectsSection || projectCards.length === 0) {
    return;
  }

  // Show everything without animation when reduced motion is enabled.
  if (prefersReducedMotion) {
    projectCards.forEach((card) => {
      card.classList.add('is-project-visible');
    });

    return;
  }

  let lastScrollY = window.scrollY;
  let isScrollingUp = false;
  let animationTimers = [];

  // Track whether the visitor is scrolling up or down.
  window.addEventListener(
    'scroll',
    () => {
      isScrollingUp = window.scrollY < lastScrollY;
      lastScrollY = window.scrollY;
    },
    { passive: true }
  );

  function clearAnimationTimers() {
    animationTimers.forEach((timer) => {
      window.clearTimeout(timer);
    });

    animationTimers = [];
  }

  const projectObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        clearAnimationTimers();

        projectsSection.dataset.projectDirection =
          isScrollingUp ? 'up' : 'down';

        // Normal order going down; reverse order going up.
        const orderedCards = isScrollingUp
          ? [...projectCards].reverse()
          : projectCards;

        orderedCards.forEach((card, index) => {
          const delay = entry.isIntersecting
            ? index * 180
            : index * 110;

          const timer = window.setTimeout(() => {
            card.classList.toggle(
              'is-project-visible',
              entry.isIntersecting
            );
          }, delay);

          animationTimers.push(timer);
        });
      });
    },
    {
      threshold: 0.18,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  projectObserver.observe(projectsSection);
}

// Give the background blobs a light parallax drift as the page scrolls.
function updateBackdropMotion() {
  const scrollY = window.scrollY;
  const depthOne = Math.min(scrollY * 0.045, 120);
  const depthTwo = Math.min(scrollY * 0.03, 90);

  if (backdrops[0]) {
    backdrops[0].style.transform = `translate3d(0, ${depthOne}px, 0) scale(1.02)`;
  }

  if (backdrops[1]) {
    backdrops[1].style.transform = `translate3d(0, ${-depthTwo}px, 0) scale(1.03)`;
  }

  scrollRafId = 0;
}

// Keep the top bar merged at the top, then split it apart once the page is scrolled.
function updateTopbarLayout() {
  if (!topbar) {
    return;
  }

  const isSeparated = window.scrollY > 0;
  topbar.classList.toggle('is-separated', isSeparated);
  topbar.classList.toggle('is-combined', !isSeparated);
}

function setTopbarActivity(isActive, isScrolling = false) {
  if (!topbar) {
    return;
  }

  topbar.classList.toggle('is-active', isActive);
  topbar.classList.toggle('is-scrolling', isScrolling);

  if (!isActive && !isScrolling) {
    topbar.classList.remove('is-active');
  }
}

function markTopbarActive({ scrolling = false } = {}) {
  if (!topbar) {
    return;
  }

  clearTimeout(topbarIdleTimerId);
  setTopbarActivity(true, scrolling);

  topbarIdleTimerId = window.setTimeout(() => {
    setTopbarActivity(false, false);
  }, 1100);
}

function initializeSplitButtonAnimations() {
  splitButtonGroups.forEach((group) => {
    const controls = group.querySelectorAll(':scope > .button, :scope > .project-link, :scope > button, :scope > a');

    if (controls.length < 2) {
      return;
    }

    group.classList.add('multi-button-group');

    const isCenterOriginGroup = group.classList.contains('contact-actions');

    if (isCenterOriginGroup) {
      group.classList.add('split-origin-center');
    }

    const centerIndex = (controls.length - 1) / 2;

    controls.forEach((control, index) => {
      control.style.setProperty('--split-index', String(index));

      if (isCenterOriginGroup) {
        const splitDistance = centerIndex - index;
        const splitDelay = Math.abs(splitDistance);
        control.style.setProperty('--split-distance', splitDistance.toFixed(2));
        control.style.setProperty('--split-delay', splitDelay.toFixed(2));
      }
    });
  });

  if (prefersReducedMotion) {
    return;
  }

  const playSplitAnimation = (group) => {
    if (group.dataset.splitAnimating === '1') {
      return;
    }

    group.dataset.splitAnimating = '1';
    group.classList.remove('is-split-animating');

    // Restart animation cleanly each time the group re-enters viewport.
    void group.offsetWidth;
    group.classList.add('is-split-animating');

    window.setTimeout(() => {
      group.classList.remove('is-split-animating');
      group.dataset.splitAnimating = '0';
    }, 980);
  };

  const splitObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playSplitAnimation(entry.target);
        }
      });
    },
    {
      threshold: 0.5,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  document.querySelectorAll('.multi-button-group').forEach((group) => {
    splitObserver.observe(group);
  });
}

// Let the top bar drift slightly as the page scrolls so it feels like a floating panel.
function updateTopbarMotion() {
  if (!topbar) {
    return;
  }

  updateTopbarLayout();

  if (prefersReducedMotion) {
    topbar.style.setProperty('--topbar-translate-y', '0px');
    topbar.style.setProperty('--topbar-scale', '1');
    topbar.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.08)';
    return;
  }

  const scrollY = window.scrollY;
  const lift = Math.min(scrollY * 0.02, 12);
  const scale = 1 - Math.min(scrollY / 6000, 0.01);
  const shadowStrength = 0.08 + Math.min(scrollY / 1400, 0.1);

  topbar.style.setProperty('--topbar-translate-y', `${lift.toFixed(2)}px`);
  topbar.style.setProperty('--topbar-scale', scale.toFixed(4));
  topbar.style.boxShadow = `0 16px 40px rgba(0, 0, 0, ${shadowStrength.toFixed(3)})`;
}

// Run both motion systems together so they stay in sync.
function updateMotion() {
  updateRevealMotion();
  updateBackdropMotion();
  updateTopbarMotion();
}

window.addEventListener(
  'scroll',
  () => {
    markTopbarActive({ scrolling: true });

    if (!scrollRafId) {
      scrollRafId = window.requestAnimationFrame(updateMotion);
    }
  },
  { passive: true }
);

window.addEventListener('pointermove', () => {
  markTopbarActive();
});

window.addEventListener('pointerdown', () => {
  markTopbarActive();
});

window.addEventListener('keydown', () => {
  markTopbarActive();
});

if (topbar) {
  topbar.addEventListener('mouseenter', () => {
    markTopbarActive();
  });

  topbar.addEventListener('focusin', () => {
    markTopbarActive();
  });
}

window.addEventListener('resize', () => {
  if (!scrollRafId) {
    scrollRafId = window.requestAnimationFrame(updateMotion);
  }
});

document.querySelectorAll('[data-project][data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    openProjectModal(button.dataset.project, button.dataset.view);
  });
});

if (projectModal) {
  projectModal.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-project-modal]')) {
      closeProjectModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !projectModal.hidden) {
      closeProjectModal();
    }
  });
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    updateMotion();
  });
}

// If the user has not chosen a theme manually, stay in sync with OS changes.
prefersDarkQuery.addEventListener('change', (event) => {
  if (!localStorage.getItem('portfolio-theme')) {
    applyTheme(event.matches ? 'dark' : 'light');
    updateMotion();
  }
});

initializeTheme();
initializeSplitButtonAnimations();
initializeProjectCardAnimations();
updateMotion();
