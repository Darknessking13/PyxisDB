const PyxisDB = require('./lib/cjs/pyxisdb');



const pyx = {

    connect: async (url) => {

        try {

            const ping = await PyxisDB.connect(url);

            return pyx;

        } catch (error) {

            console.error('Failed to connect to PyxisCloud:', error);

            throw error;

        }

    },

    schema: (...args) => PyxisDB.schema(...args),

    model: (...args) => PyxisDB.model(...args),

};



module.exports = pyx
