# pdfext

### Overview

pdfext is a simple library to extract text from pdf files.

#### Sample usage

For the referenced book for example you can access [here](https://www.planetebook.com/1984/)

```javascript
import { PDFReader } from "pdfext/reader.js"

const path = "books/1984.pdf"
const reader = new PDFReader(path)
for (let i = 0; i < reader.pageSize(); i++) {
    const page = reader.page(i)
    console.log(`Page ${j+1} has the following contents`)
    console.log(page.join(""))
}
```

And the output for 3rd page.

```
Page 3 has the following contents
It was a bright cold day in April, and the clocks were strik-ing thirteen. 
Winston Smith, his chin nuzzled into his breast in an e\016ort to escape the vile wind, 
slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent
a swirl of gritty dust from enter-ing along with him.\re hallway smelt of boiled cabbage and old rag mats.
At one end of it a coloured poster, too large for indoor display, had been tacked to the wall. 
It depicted simply an enor-mous face, more than a metre wide: the face of a man of about forty-\fve, 
with a heavy black moustache and rugged-ly handsome features. Winston made for the stairs. 
It was no use trying the li\013. Even at the best of times it was sel-dom working, 
and at present the electric current was cut o\016 during daylight hours. It was part of the economy
drive in preparation for Hate Week. \re \nat was seven \nights up, and Winston, who was thirty-nine
and had a varicose ulcer above his right ankle, went slowly, resting several times on the way. 
On each landing, opposite the li\013-sha\013, the poster with the enormous face gazed from the wall.
It was one of those pictures which are so contrived that the eyes follow you about when you move. 
BIG BROTHER IS WATCHING YOU, the caption beneath it ran.Inside the \nat a fruity voice was reading
 out a list of \fg-
```
