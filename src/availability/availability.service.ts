import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateAvailabilityDto } from "./dto/availability.dto"
import { DateUtils } from "../utils/date.utils"

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) { }

  async getEngineerAvailability(engineerId: string, date: Date) {
    const availabilities = await this.prisma.availability.findMany({
      where: { userId: engineerId },
    })


    const weekDays = DateUtils.getWeekDays(date)

    return weekDays.flatMap((day) => {
      const dayAvailabilities = availabilities.filter((a) => a.day.toLowerCase() === day.dayName.toLowerCase())
      return dayAvailabilities.map((a) => ({
        id: a.id,
        day: a.day,
        start: a.start,
        end: a.end,
        userId: a.userId,
      }))
    })
  }

  async getWeeklyAvailability(engineerId: string) {
    return this.prisma.availability.findMany({
      where: { userId: engineerId },
    })
  }

  // Modifica il metodo createAvailability per gestire meglio le disponibilità oltre la mezzanotte
  async createAvailability(userId: string, data: CreateAvailabilityDto) {
    console.log('=== INIZIO CREAZIONE DISPONIBILITÀ ===');
    console.log(`Input ricevuto: giorno=${data.day}, inizio=${data.start}, fine=${data.end}, utente=${userId}`);
    
    // Get existing availabilities for the same day
    const existingAvailabilities = await this.prisma.availability.findMany({
      where: {
        userId,
        day: data.day,
      },
    });
  
    console.log(`Disponibilità esistenti trovate: ${existingAvailabilities.length}`);
    existingAvailabilities.forEach((a, idx) => {
      console.log(`[${idx}] id=${a.id}, inizio=${a.start}, fine=${a.end}`);
    });
  
    // Convert time strings to minutes for comparison
    const newStart = this.timeStringToMinutes(data.start);
    const newEnd = this.timeStringToMinutes(data.end);
    console.log(`Nuova disponibilità in minuti: inizio=${newStart}, fine=${newEnd}`);
  
    // Gestisci il caso in cui l'orario di fine è 00:00 (mezzanotte)
    const adjustedNewEnd = newEnd === 0 ? 24 * 60 : newEnd;
    console.log(`Fine disponibilità aggiustata: ${adjustedNewEnd}`);
  
    // Gestisci attraversamento mezzanotte
    const newSpansMidnight = adjustedNewEnd < newStart;
    console.log(`La nuova disponibilità attraversa la mezzanotte: ${newSpansMidnight}`);
    
    // Array per raccogliere tutte le fasce orarie (normalizzate per gestire la mezzanotte)
    const normalizedRanges = [];
    
    // Aggiungi la nuova disponibilità, gestendo attraversamento mezzanotte
    if (newSpansMidnight) {
      // Se attraversa mezzanotte, crea due intervalli: uno fino a mezzanotte e uno da mezzanotte
      normalizedRanges.push({ 
        start: newStart, 
        end: 24 * 60, 
        id: "new-1" 
      });
      normalizedRanges.push({ 
        start: 0, 
        end: adjustedNewEnd, 
        id: "new-2" 
      });
      console.log(`Nuova disponibilità divisa: (1) inizio=${newStart}, fine=${24*60} | (2) inizio=0, fine=${adjustedNewEnd}`);
    } else {
      // Altrimenti, mantieni l'intervallo così com'è
      normalizedRanges.push({ 
        start: newStart, 
        end: adjustedNewEnd, 
        id: "new" 
      });
      console.log(`Nuova disponibilità: inizio=${newStart}, fine=${adjustedNewEnd}`);
    }
  
    // Aggiungi disponibilità esistenti, gestendo attraversamento mezzanotte
    for (const existing of existingAvailabilities) {
      const existingStart = this.timeStringToMinutes(existing.start);
      let existingEnd = this.timeStringToMinutes(existing.end);
      
      // Se fine è 00:00, trattalo come 24:00
      if (existingEnd === 0) existingEnd = 24 * 60;
      
      console.log(`Disponibilità esistente ${existing.id}: inizio=${existingStart}, fine=${existingEnd}`);
      
      // Verifica se attraversa la mezzanotte
      const existingSpansMidnight = existingEnd < existingStart;
      console.log(`La disponibilità esistente attraversa la mezzanotte: ${existingSpansMidnight}`);
      
      if (existingSpansMidnight) {
        // Se attraversa mezzanotte, crea due intervalli
        normalizedRanges.push({ 
          start: existingStart, 
          end: 24 * 60, 
          id: `${existing.id}-1` 
        });
        normalizedRanges.push({ 
          start: 0, 
          end: existingEnd, 
          id: `${existing.id}-2` 
        });
        console.log(`Disponibilità esistente divisa: (1) inizio=${existingStart}, fine=${24*60} | (2) inizio=0, fine=${existingEnd}`);
      } else {
        normalizedRanges.push({ 
          start: existingStart, 
          end: existingEnd, 
          id: existing.id 
        });
      }
    }
  
    // Sort by start time
    normalizedRanges.sort((a, b) => a.start - b.start);
    console.log('Intervalli normalizzati e ordinati:');
    normalizedRanges.forEach((r, idx) => {
      console.log(`[${idx}] id=${r.id}, inizio=${r.start}, fine=${r.end}`);
    });
  
    // Merge intervalli sovrapposti o adiacenti manualmente
    const mergedRanges = [];
    if (normalizedRanges.length > 0) {
      let current = {
        start: normalizedRanges[0].start,
        end: normalizedRanges[0].end,
        originalIds: [normalizedRanges[0].id]
      };
      
      for (let i = 1; i < normalizedRanges.length; i++) {
        const next = normalizedRanges[i];
        // Se l'intervallo successivo si sovrappone o è adiacente a quello corrente
        if (next.start <= current.end || next.start <= current.end + 1) {
          // Estendi l'intervallo corrente
          current.end = Math.max(current.end, next.end);
          current.originalIds.push(next.id);
        } else {
          // Altrimenti, aggiungi l'intervallo corrente al risultato e inizia un nuovo intervallo
          mergedRanges.push(current);
          current = {
            start: next.start,
            end: next.end,
            originalIds: [next.id]
          };
        }
      }
      // Aggiungi l'ultimo intervallo
      mergedRanges.push(current);
    }
    
    console.log('Intervalli dopo il merge:');
    mergedRanges.forEach((r, idx) => {
      console.log(`[${idx}] inizio=${r.start}, fine=${r.end}, ids=[${r.originalIds.join(', ')}]`);
    });
  
    // Combina gli intervalli che possono essere uniti attraverso la mezzanotte
    // Questo passaggio è cruciale per gestire il caso in cui un intervallo finisce a mezzanotte e un altro inizia a mezzanotte
    const finalRanges = this.combineRangesThroughMidnight(mergedRanges);
    console.log('Intervalli finali dopo il merge attraverso la mezzanotte:');
    //@ts-ignore
    finalRanges.forEach((r: { start: any; end: any; originalIds: any[] }, idx: any) => {
      console.log(`[${idx}] inizio=${r.start}, fine=${r.end}, ids=[${r.originalIds.join(', ')}]`);
    });
  
    // Raccogli tutti gli ID originali (quelli non "new-X") per l'eliminazione
    const allOriginalIds = new Set();
    for (const range of finalRanges) {
      range.originalIds.forEach((id: string) => {
        // Se l'ID non include "new", aggiungilo per l'eliminazione
        // Gestisce anche gli ID divisi come "id-1" o "id-2"
        const baseId = id.split('-')[0];
        if (baseId !== "new") {
          const originalId = existingAvailabilities.find(a => a.id === baseId || a.id.startsWith(baseId + '-'))?.id;
          if (originalId) allOriginalIds.add(originalId);
        }
      });
    }
  
    // Elimina tutte le disponibilità esistenti che fanno parte del merge
    if (allOriginalIds.size > 0) {
      const idsToDelete = Array.from(allOriginalIds);
      console.log(`Eliminazione disponibilità esistenti con id: ${idsToDelete.join(', ')}`);
      await this.prisma.availability.deleteMany({
        where: {
          id: {
            //@ts-ignore
            in: idsToDelete,
          },
        },
      });
    }
  
    // Crea nuove disponibilità per ogni intervallo finale
    const createdAvailabilities = [];
    for (const range of finalRanges) {
      // Converti back a formato orario
      let startHour = Math.floor(range.start / 60);
      let startMinute = range.start % 60;
      
      // Gestisci la normalizzazione dell'orario di fine
      let endTime;
      if (range.end % (24 * 60) === 0) {
        // Se l'orario di fine è esattamente mezzanotte, usa "00:00"
        endTime = "00:00";
      } else {
        let endHour = Math.floor(range.end / 60) % 24;
        let endMinute = range.end % 60;
        endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      }
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      
      console.log(`Creazione disponibilità: inizio=${startTime}, fine=${endTime}`);
      
      const created = await this.prisma.availability.create({
        data: {
          day: data.day,
          start: startTime,
          end: endTime,
          user: { connect: { id: userId } },
        },
      });
      console.log(`Disponibilità creata: id=${created.id}, inizio=${created.start}, fine=${created.end}`);
  
      createdAvailabilities.push(created);
    }
  
    console.log(`Totale disponibilità create: ${createdAvailabilities.length}`);
    console.log('=== FINE CREAZIONE DISPONIBILITÀ ===');
  
    return createdAvailabilities;
  }
  
  // Metodo ausiliario per combinare intervalli attraverso la mezzanotte
  private combineRangesThroughMidnight(ranges: string | any[]) {
    if (ranges.length <= 1) return ranges;
    
    const result = [];
    let midnightEndIndex = -1;
    let midnightStartIndex = -1;
    
    // Trova gli intervalli che terminano a mezzanotte o iniziano a mezzanotte
    for (let i = 0; i < ranges.length; i++) {
      if (ranges[i].end === 24 * 60) {
        midnightEndIndex = i;
      }
      if (ranges[i].start === 0) {
        midnightStartIndex = i;
      }
    }
    
    // Se abbiamo un intervallo che termina a mezzanotte e uno che inizia a mezzanotte, uniscili
    if (midnightEndIndex !== -1 && midnightStartIndex !== -1 && midnightEndIndex !== midnightStartIndex) {
      console.log(`Combinazione di intervalli attraverso la mezzanotte: [${midnightEndIndex}] con [${midnightStartIndex}]`);
      
      // Crea array risultante escludendo gli intervalli da unire
      for (let i = 0; i < ranges.length; i++) {
        if (i !== midnightEndIndex && i !== midnightStartIndex) {
          result.push(ranges[i]);
        }
      }
      
      // Aggiungi l'intervallo unito
      result.push({
        start: ranges[midnightEndIndex].start,
        end: ranges[midnightStartIndex].end,
        originalIds: [...ranges[midnightEndIndex].originalIds, ...ranges[midnightStartIndex].originalIds]
      });
    } else {
      // Nessun intervallo da unire attraverso la mezzanotte
      return ranges;
    }
    
    return result;
  }

  // Modifica il metodo updateAvailability per evitare di eliminare e ricreare la disponibilità
  async updateAvailability(id: string, data: CreateAvailabilityDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    })

    if (!availability) {
      throw new NotFoundException("Availability not found")
    }

    // Invece di eliminare e ricreare, aggiorniamo direttamente la disponibilità esistente
    return this.prisma.availability.update({
      where: { id },
      data: {
        day: data.day,
        start: data.start,
        end: data.end,
      },
    })
  }

  async deleteAvailability(id: string) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    })

    if (!availability) {
      throw new NotFoundException("Availability not found")
    }

    return this.prisma.availability.delete({
      where: { id },
    })
  }

  // Helper methods for time conversion
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }
}

